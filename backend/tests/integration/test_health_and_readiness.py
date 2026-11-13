"""Integration tests verifying production health probes, readiness checks, and system diagnostics."""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.main import create_app


@pytest.fixture
async def app_with_db():
    """Create test application wired to in-memory SQLite database."""
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
async def test_root_and_v1_health_probes(app_with_db):
    """Verify both /healthz and /api/v1/healthz return healthy status."""
    async with AsyncClient(
        transport=ASGITransport(app=app_with_db), base_url="http://test"
    ) as client:
        # Top-level probe
        res1 = await client.get("/healthz")
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["status"] == "ok"
        assert data1["database"] == "healthy"

        # V1 router probe
        res2 = await client.get("/api/v1/healthz")
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["status"] == "ok"
        assert data2["database"] == "healthy"


@pytest.mark.asyncio
async def test_readyz_probe(app_with_db):
    """Verify readiness probe checks database connectivity and storage workspace."""
    async with AsyncClient(
        transport=ASGITransport(app=app_with_db), base_url="http://test"
    ) as client:
        res = await client.get("/readyz")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ready"
        assert data["checks"]["database"] == "healthy"
        assert data["checks"]["storage"] == "writable"


@pytest.mark.asyncio
async def test_system_status_diagnostics(app_with_db):
    """Verify /api/v1/status reports complete diagnostic information."""
    async with AsyncClient(
        transport=ASGITransport(app=app_with_db), base_url="http://test"
    ) as client:
        res = await client.get("/api/v1/status")
        assert res.status_code == 200
        data = res.json()
        assert data["service"] == "github-ai-workspace-backend"
        assert "database" in data
        assert "workspace" in data
        assert "ai" in data
        assert "security" in data
        assert data["security"]["approval_required_for_mutations"] is True
