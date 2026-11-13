"""Integration tests for the full end-to-end chat and approval workflow."""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.main import create_app


@pytest.fixture
async def app_with_test_db():
    """Create test application with in-memory database."""
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
async def test_chat_read_only_auto_completes(app_with_test_db):
    """Test sending a message to list repositories completes without approval."""
    async with AsyncClient(
        transport=ASGITransport(app=app_with_test_db), base_url="http://test"
    ) as client:
        # 1. Create conversation
        conv_res = await client.post(
            "/api/v1/chat/conversations", json={"title": "List Repos Chat"}
        )
        conv_id = conv_res.json()["id"]

        # 2. Send read-only request
        msg_res = await client.post(
            f"/api/v1/chat/conversations/{conv_id}/messages",
            json={"content": "List my repositories please"},
        )
        assert msg_res.status_code == 200
        body = msg_res.json()
        assert body["status"] == "COMPLETED"
        assert "Verified Operation" in body["message"]["content"]


@pytest.mark.asyncio
async def test_chat_mutation_pauses_and_executes_on_approval(app_with_test_db):
    """Test full cycle: user prompt -> needs approval -> user approves -> executed."""
    async with AsyncClient(
        transport=ASGITransport(app=app_with_test_db), base_url="http://test"
    ) as client:
        # 1. Create conversation
        conv_res = await client.post(
            "/api/v1/chat/conversations",
            json={"title": "Issue Creator", "active_repo": "octocat/Hello-World"},
        )
        conv_id = conv_res.json()["id"]

        # 2. Send mutating instruction (create issue)
        msg_res = await client.post(
            f"/api/v1/chat/conversations/{conv_id}/messages",
            json={"content": "Create issue for UI crash in octocat/Hello-World"},
        )
        assert msg_res.status_code == 200
        body = msg_res.json()
        assert body["status"] == "NEEDS_APPROVAL"
        approval = body["approval"]
        approval_id = approval["id"]
        action_hash = approval["action_hash"]

        # 3. User reviews and approves the exact action hash
        decision_res = await client.post(
            f"/api/v1/approvals/{approval_id}/decision",
            json={"action_hash": action_hash, "decision": "APPROVE"},
        )
        assert decision_res.status_code == 200
        assert decision_res.json()["status"] == "APPROVED"

        # 4. Fetch conversation history to verify assistant response was added
        conv_check = await client.get(f"/api/v1/chat/conversations/{conv_id}")
        assert conv_check.status_code == 200
        messages = conv_check.json()["messages"]
        # History: user initial prompt, assistant verified execution
        assert len(messages) >= 2
        last_msg = messages[-1]
        assert last_msg["role"] == "assistant"
        assert "Verified Operation: `create_issue`" in last_msg["content"]
