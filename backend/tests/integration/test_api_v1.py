"""Integration tests for FastAPI v1 API routes."""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.security import generate_action_hash
from app.main import create_app
from app.models.approval import ApprovalRequest, ApprovalStatus
from app.models.conversation import Conversation


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

    yield test_app, session_factory
    await engine.dispose()


@pytest.mark.asyncio
async def test_health_v1_endpoint(app_with_test_db):
    test_app, _ = app_with_test_db
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as client:
        res = await client.get("/api/v1/healthz")
        assert res.status_code == 200
        data = res.json()
        assert data["database"] == "healthy"
        assert data["service"] == "github-ai-workspace-backend"


@pytest.mark.asyncio
async def test_chat_conversations_api(app_with_test_db):
    test_app, _ = app_with_test_db
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as client:
        # Create
        create_res = await client.post(
            "/api/v1/chat/conversations",
            json={"title": "Test Chat", "active_repo": "octocat/Hello-World"},
        )
        assert create_res.status_code == 200
        conv = create_res.json()
        assert conv["title"] == "Test Chat"
        conv_id = conv["id"]

        # Get
        get_res = await client.get(f"/api/v1/chat/conversations/{conv_id}")
        assert get_res.status_code == 200
        assert get_res.json()["id"] == conv_id

        # List
        list_res = await client.get("/api/v1/chat/conversations")
        assert list_res.status_code == 200
        assert len(list_res.json()) >= 1

        # Delete
        del_res = await client.delete(f"/api/v1/chat/conversations/{conv_id}")
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "deleted"


@pytest.mark.asyncio
async def test_repos_api(app_with_test_db):
    test_app, _ = app_with_test_db
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as client:
        # Sync repo
        sync_res = await client.post(
            "/api/v1/repos/sync",
            json={"full_name": "google/jax"},
        )
        assert sync_res.status_code == 200
        repo_data = sync_res.json()
        assert repo_data["full_name"] == "google/jax"
        assert repo_data["owner"] == "google"

        # List repos
        list_res = await client.get("/api/v1/repos")
        assert list_res.status_code == 200
        assert any(r["full_name"] == "google/jax" for r in list_res.json())


@pytest.mark.asyncio
async def test_approval_decision_workflow(app_with_test_db):
    test_app, session_factory = app_with_test_db

    # Seed conversation and pending approval
    payload = {"owner": "test-owner", "repo": "test-repo", "title": "New Issue"}
    step_id = "step-42"
    action_hash = generate_action_hash("create_issue", payload, step_id)

    async with session_factory() as session:
        conv = Conversation(title="Approval Test")
        session.add(conv)
        await session.commit()
        await session.refresh(conv)

        approval = ApprovalRequest(
            conversation_id=conv.id,
            step_id=step_id,
            tool_name="create_issue",
            action_hash=action_hash,
            description="Create issue in GitHub",
            payload=payload,
            status=ApprovalStatus.PENDING.value,
        )
        session.add(approval)
        await session.commit()
        await session.refresh(approval)
        approval_id = approval.id

    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as client:
        # Verify listed in pending
        pending_res = await client.get("/api/v1/approvals/pending")
        assert pending_res.status_code == 200
        assert any(a["id"] == approval_id for a in pending_res.json())

        # Test rejection of hash mismatch
        mismatch_res = await client.post(
            f"/api/v1/approvals/{approval_id}/decision",
            json={
                "action_hash": "wrong_hash_123456789012345678901234567890123456789012345678901234",
                "decision": "APPROVE",
            },
        )
        assert mismatch_res.status_code == 403

        # Test valid approval
        approve_res = await client.post(
            f"/api/v1/approvals/{approval_id}/decision",
            json={
                "action_hash": action_hash,
                "decision": "APPROVE",
                "reviewer_notes": "Reviewed and verified parameters.",
            },
        )
        assert approve_res.status_code == 200
        updated = approve_res.json()
        assert updated["status"] == "APPROVED"
        assert updated["reviewer_notes"] == "Reviewed and verified parameters."

        # Verify audit event was logged
        audit_res = await client.get("/api/v1/audit?event_type=APPROVAL_DECISION")
        assert audit_res.status_code == 200
        events = audit_res.json()
        assert any(e["action_hash"] == action_hash for e in events)
