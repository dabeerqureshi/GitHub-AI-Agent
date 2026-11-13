"""Integration tests for Repository Intelligence API endpoints."""

from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from app.agent.tools.git_local import LocalGitManager
from app.api.v1 import intelligence as intelligence_module
from app.core.database import get_db
from app.main import create_app
from app.services.repo_intelligence import RepoIntelligenceService
from tests.fixtures.sample_repo import create_sample_repository


@pytest.fixture
def intelligence_app(tmp_path: Path, in_memory_db):
    """Create test application wired to a sample git repository."""
    create_sample_repository(tmp_path, owner="testorg", repo_name="sample-repo")
    git_manager = LocalGitManager(workspace_root=str(tmp_path))
    test_service = RepoIntelligenceService(git_manager=git_manager)

    # Monkeypatch singleton service in module
    orig_service = intelligence_module.service
    intelligence_module.service = test_service

    app = create_app()

    async def override_get_db():
        yield in_memory_db

    app.dependency_overrides[get_db] = override_get_db

    yield app, test_service

    intelligence_module.service = orig_service


@pytest.mark.asyncio
async def test_api_browse_files(intelligence_app):
    """Test GET /api/v1/intelligence/{owner}/{repo}/files."""
    app, _ = intelligence_app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/intelligence/testorg/sample-repo/files")
        assert res.status_code == 200
        items = res.json()
        names = [i["name"] for i in items]
        assert "README.md" in names
        assert "src" in names

        # Browse nested subdirectory
        res_sub = await client.get("/api/v1/intelligence/testorg/sample-repo/files?path=src")
        assert res_sub.status_code == 200
        sub_items = res_sub.json()
        sub_names = [i["name"] for i in sub_items]
        assert "calculator.py" in sub_names
        assert "index.ts" in sub_names


@pytest.mark.asyncio
async def test_api_get_file_content_with_lines(intelligence_app):
    """Test GET /api/v1/intelligence/{owner}/{repo}/file with line range."""
    app, _ = intelligence_app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(
            "/api/v1/intelligence/testorg/sample-repo/file?path=src/calculator.py&start_line=3&end_line=7"
        )
        assert res.status_code == 200
        data = res.json()
        assert data["path"] == "src/calculator.py"
        assert data["citation"] == "[src/calculator.py#L3-L7]"
        assert "3 | class Calculator:" in data["content"]

        # Test 404 for missing file
        res_missing = await client.get(
            "/api/v1/intelligence/testorg/sample-repo/file?path=nonexistent.txt"
        )
        assert res_missing.status_code == 404


@pytest.mark.asyncio
async def test_api_search_repository_code(intelligence_app):
    """Test GET /api/v1/intelligence/{owner}/{repo}/search."""
    app, _ = intelligence_app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/intelligence/testorg/sample-repo/search?query=UserConfig")
        assert res.status_code == 200
        matches = res.json()
        assert len(matches) >= 1
        ts_match = matches[0]
        assert "index.ts" in ts_match["path"]
        assert ts_match["citation"] == f"[{ts_match['path']}#L{ts_match['line_number']}]"


@pytest.mark.asyncio
async def test_api_compare_branches(intelligence_app):
    """Test GET /api/v1/intelligence/{owner}/{repo}/compare."""
    app, _ = intelligence_app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(
            "/api/v1/intelligence/testorg/sample-repo/compare?base=main&head=feature-auth"
        )
        assert res.status_code == 200
        data = res.json()
        assert data["base_branch"] == "main"
        assert data["head_branch"] == "feature-auth"
        assert data["ahead_by"] == 1
        assert "src/auth.py" in data["changed_files"]


@pytest.mark.asyncio
async def test_api_architecture_summary(intelligence_app):
    """Test GET /api/v1/intelligence/{owner}/{repo}/summary."""
    app, _ = intelligence_app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/intelligence/testorg/sample-repo/summary")
        assert res.status_code == 200
        data = res.json()
        assert "Python" in data["primary_languages"]
        assert len(data["verified_facts"]) > 0
        assert len(data["reasonable_inferences"]) > 0
        assert len(data["unknown_information"]) > 0
        assert "### Verified Facts" in data["markdown_report"]


@pytest.mark.asyncio
async def test_api_get_context_snapshot_and_incremental(intelligence_app):
    """Test GET /api/v1/intelligence/{owner}/{repo}/context."""
    app, _ = intelligence_app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # First query: snapshot is created
        res = await client.get("/api/v1/intelligence/testorg/sample-repo/context")
        assert res.status_code == 200
        snapshot1 = res.json()
        assert snapshot1["full_name"] == "testorg/sample-repo"
        assert "Python" in snapshot1["languages"]
        assert len(snapshot1["documentation_files"]) > 0

        # Second query: snapshot is retrieved from cache
        res2 = await client.get("/api/v1/intelligence/testorg/sample-repo/context")
        assert res2.status_code == 200
        snapshot2 = res2.json()
        assert snapshot2["id"] == snapshot1["id"]
        assert snapshot2["last_indexed_commit_sha"] == snapshot1["last_indexed_commit_sha"]
