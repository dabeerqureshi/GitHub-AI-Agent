"""Integration tests for GitHub authentication and repository discovery API."""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from unittest.mock import patch

from app.core.config import get_settings
from app.core.database import Base, get_db
from app.main import create_app


@pytest.fixture
async def app_with_test_db():
    """Create test application with isolated in-memory database."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async def override_get_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    test_app = create_app()
    test_app.dependency_overrides[get_db] = override_get_db

    yield test_app
    await engine.dispose()


@pytest.mark.asyncio
async def test_github_auth_status_unconnected(app_with_test_db):
    """Verify auth status returns is_connected=False when no token is configured."""
    settings = get_settings()
    orig_token = settings.GITHUB_PERSONAL_ACCESS_TOKEN
    settings.GITHUB_PERSONAL_ACCESS_TOKEN = ""

    async with AsyncClient(transport=ASGITransport(app=app_with_test_db), base_url="http://test") as client:
        res = await client.get("/api/v1/auth/github/status")
        assert res.status_code == 200
        data = res.json()
        assert data["is_connected"] is False
        assert data["user"] is None

    settings.GITHUB_PERSONAL_ACCESS_TOKEN = orig_token


@pytest.mark.asyncio
async def test_github_connect_and_disconnect_flow(app_with_test_db):
    """Verify connecting GitHub PAT validates user, discovers repos, and disconnects."""
    mock_user_data = {
        "login": "test-dev",
        "name": "Test Developer",
        "avatar_url": "https://avatars.githubusercontent.com/u/12345",
        "html_url": "https://github.com/test-dev",
        "public_repos": 5,
        "total_private_repos": 2,
    }
    mock_repos_data = [
        {
            "full_name": "test-dev/awesome-app",
            "name": "awesome-app",
            "owner": {"login": "test-dev"},
            "default_branch": "main",
            "private": False,
            "description": "An awesome application",
        },
        {
            "full_name": "test-dev/secret-service",
            "name": "secret-service",
            "owner": {"login": "test-dev"},
            "default_branch": "develop",
            "private": True,
            "description": "Internal microservice",
        },
    ]

    class MockResponse:
        def __init__(self, status_code, json_data):
            self.status_code = status_code
            self._json = json_data
            self.text = "Mock text"

        def json(self):
            return self._json

    orig_get = AsyncClient.get

    async def mock_get(self, url, *args, **kwargs):
        url_str = str(url)
        if "api.github.com/user/repos" in url_str:
            return MockResponse(200, mock_repos_data)
        elif "api.github.com/user" in url_str:
            return MockResponse(200, mock_user_data)
        return await orig_get(self, url, *args, **kwargs)

    with patch.object(AsyncClient, "get", mock_get):
        async with AsyncClient(transport=ASGITransport(app=app_with_test_db), base_url="http://test") as client:
            # 1. Connect Token
            connect_res = await client.post(
                "/api/v1/auth/github",
                json={"token": "github_pat_11TEST_TOKEN_CONNECT_998877"},
            )
            assert connect_res.status_code == 200
            data = connect_res.json()
            assert data["status"] == "connected"
            assert data["user"]["login"] == "test-dev"
            assert data["synced_repositories"] == 2

            # 2. Verify Status Endpoint
            status_res = await client.get("/api/v1/auth/github/status")
            assert status_res.status_code == 200
            sdata = status_res.json()
            assert sdata["is_connected"] is True
            assert sdata["user"]["login"] == "test-dev"
            assert "github_pat" in sdata["masked_token"]

            # 3. Verify Repositories API returns the synced repositories
            repos_res = await client.get("/api/v1/repos")
            assert repos_res.status_code == 200
            rdata = repos_res.json()
            names = [r["full_name"] for r in rdata]
            assert "test-dev/awesome-app" in names
            assert "test-dev/secret-service" in names

            # 4. Disconnect
            disc_res = await client.post("/api/v1/auth/github/disconnect")
            assert disc_res.status_code == 200
            assert disc_res.json()["status"] == "disconnected"

            # 5. Status should now be disconnected
            post_status = await client.get("/api/v1/auth/github/status")
            assert post_status.json()["is_connected"] is False
