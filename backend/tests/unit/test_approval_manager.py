"""Unit tests for Centralized ApprovalManager: TTL expiration, tamper resistance, and replay protection."""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base
from app.models.approval import ApprovalStatus
from app.models.conversation import Conversation
from app.services.approval_service import (
    ApprovalExpiredException,
    ApprovalManager,
    ApprovalTamperedException,
    DuplicateActionException,
    UnauthorizedApprovalException,
)


@pytest.fixture
async def async_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        # Create parent conversation
        conv = Conversation(id="conv-123", title="Test Conversation")
        session.add(conv)
        await session.commit()
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_create_approval_request_with_ttl_and_nonce(async_db: AsyncSession):
    manager = ApprovalManager(async_db, default_ttl_minutes=15)
    app = await manager.create_approval_request(
        conversation_id="conv-123",
        tool_name="create_issue",
        step_id="step-1",
        description="Create bug report",
        payload={"title": "Bug", "body": "Fix it"},
        repo_name="octocat/Hello-World",
        user_id="alice",
    )

    assert app.id is not None
    assert app.user_id == "alice"
    assert app.repo_name == "octocat/Hello-World"
    assert app.status == ApprovalStatus.PENDING.value
    assert app.execution_nonce is not None
    assert app.expires_at is not None
    assert app.is_executed is False
    exp = app.expires_at if app.expires_at.tzinfo else app.expires_at.replace(tzinfo=UTC)
    assert exp > datetime.now(UTC)


@pytest.mark.asyncio
async def test_resolve_approval_success(async_db: AsyncSession):
    manager = ApprovalManager(async_db)
    app = await manager.create_approval_request(
        conversation_id="conv-123",
        tool_name="merge_pull_request",
        step_id="step-2",
        description="Merge PR #10",
        payload={"pr_number": 10},
        user_id="alice",
    )

    resolved = await manager.resolve_approval(
        approval_id=app.id,
        decision="APPROVED",
        user_id="alice",
        reviewer_notes="LGTM",
    )

    assert resolved.status == ApprovalStatus.APPROVED.value
    assert resolved.reviewer_notes == "LGTM"
    assert resolved.resolved_at is not None


@pytest.mark.asyncio
async def test_resolve_expired_approval_rejected(async_db: AsyncSession):
    manager = ApprovalManager(async_db)
    app = await manager.create_approval_request(
        conversation_id="conv-123",
        tool_name="delete_branch",
        step_id="step-3",
        description="Delete branch",
        payload={"branch": "old-feature"},
        user_id="alice",
    )

    # Force expiration into the past
    app.expires_at = datetime.now(UTC) - timedelta(minutes=5)
    await async_db.commit()

    with pytest.raises(ApprovalExpiredException, match="expired"):
        await manager.resolve_approval(app.id, decision="APPROVED", user_id="alice")

    # Verify status transitioned to EXPIRED
    refreshed = await manager.get_approval(app.id)
    assert refreshed.status == ApprovalStatus.EXPIRED.value


@pytest.mark.asyncio
async def test_resolve_tampered_payload_rejected(async_db: AsyncSession):
    manager = ApprovalManager(async_db)
    app = await manager.create_approval_request(
        conversation_id="conv-123",
        tool_name="create_pull_request",
        step_id="step-4",
        description="Create PR",
        payload={"title": "Good PR", "head": "feat"},
        user_id="alice",
    )

    # Tamper with stored payload without updating cryptographic hash
    app.payload = {"title": "Malicious PR Injection", "head": "malicious"}
    await async_db.commit()

    with pytest.raises(ApprovalTamperedException, match="tampered"):
        await manager.resolve_approval(app.id, decision="APPROVED", user_id="alice")

    refreshed = await manager.get_approval(app.id)
    assert refreshed.status == ApprovalStatus.REJECTED.value


@pytest.mark.asyncio
async def test_replay_attack_duplicate_execution_rejected(async_db: AsyncSession):
    manager = ApprovalManager(async_db)
    app = await manager.create_approval_request(
        conversation_id="conv-123",
        tool_name="close_issue",
        step_id="step-5",
        description="Close issue #1",
        payload={"issue_number": 1},
        user_id="alice",
    )

    await manager.resolve_approval(app.id, decision="APPROVED", user_id="alice")

    # First execution succeeds
    executed = await manager.mark_executed(app.id, app.execution_nonce)
    assert executed.status == ApprovalStatus.APPROVED.value
    assert executed.is_executed is True

    # Second execution attempt (replay attack) is rejected
    with pytest.raises(DuplicateActionException, match="already been executed"):
        await manager.mark_executed(app.id, app.execution_nonce)


@pytest.mark.asyncio
async def test_unauthorized_user_approval_rejected(async_db: AsyncSession):
    manager = ApprovalManager(async_db)
    app = await manager.create_approval_request(
        conversation_id="conv-123",
        tool_name="create_issue",
        step_id="step-6",
        description="Create issue",
        payload={"title": "Important Issue"},
        user_id="admin-bob",
    )

    with pytest.raises(UnauthorizedApprovalException, match="not authorized"):
        await manager.resolve_approval(app.id, decision="APPROVED", user_id="attacker-charlie")


@pytest.mark.asyncio
async def test_list_approvals_auto_expires_past_ttl(async_db: AsyncSession):
    manager = ApprovalManager(async_db)
    app = await manager.create_approval_request(
        conversation_id="conv-123",
        tool_name="create_issue",
        step_id="step-7",
        description="Auto expire test",
        payload={"title": "Will expire"},
        user_id="alice",
    )

    # Move expiration time into the past
    app.expires_at = datetime.now(UTC) - timedelta(minutes=10)
    await async_db.commit()

    approvals = await manager.list_approvals(conversation_id="conv-123")
    expired = [a for a in approvals if a.id == app.id][0]
    assert expired.status == ApprovalStatus.EXPIRED.value
