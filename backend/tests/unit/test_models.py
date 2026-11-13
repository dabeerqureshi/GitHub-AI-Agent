"""Unit tests for SQLAlchemy models and relationships."""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload

from app.core.database import Base
from app.models.approval import ApprovalRequest, ApprovalStatus
from app.models.audit import AuditEvent
from app.models.conversation import Conversation, ConversationMessage


@pytest.fixture
async def in_memory_db():
    """Create isolated SQLite database for testing."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_conversation_and_messages(in_memory_db: AsyncSession):
    """Test conversation creation with nested messages."""
    conv = Conversation(title="Debug Issue #42", active_repo="facebook/react")
    in_memory_db.add(conv)
    await in_memory_db.commit()

    msg1 = ConversationMessage(
        conversation_id=conv.id,
        role="user",
        content="Analyze the failing test in React 19",
    )
    msg2 = ConversationMessage(
        conversation_id=conv.id,
        role="assistant",
        content="Looking up the test failure...",
    )
    in_memory_db.add_all([msg1, msg2])
    await in_memory_db.commit()

    result = await in_memory_db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conv.id)
    )
    retrieved = result.scalar_one()
    assert retrieved.title == "Debug Issue #42"
    assert len(retrieved.messages) == 2


@pytest.mark.asyncio
async def test_approval_request_model(in_memory_db: AsyncSession):
    """Test approval request creation and status."""
    conv = Conversation(title="PR Session")
    in_memory_db.add(conv)
    await in_memory_db.commit()

    approval = ApprovalRequest(
        conversation_id=conv.id,
        step_id="step-12",
        tool_name="create_pull_request",
        action_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        description="Create pull request for bug fix",
        payload={"title": "Fix", "head": "fix-branch", "base": "main"},
        status=ApprovalStatus.PENDING.value,
    )
    in_memory_db.add(approval)
    await in_memory_db.commit()

    result = await in_memory_db.execute(
        select(ApprovalRequest).where(ApprovalRequest.id == approval.id)
    )
    retrieved = result.scalar_one()
    assert retrieved.status == ApprovalStatus.PENDING.value
    assert retrieved.tool_name == "create_pull_request"


@pytest.mark.asyncio
async def test_audit_event_model(in_memory_db: AsyncSession):
    """Test audit log creation."""
    audit = AuditEvent(
        event_type="TOOL_EXECUTION",
        tool_name="get_file_contents",
        status="SUCCESS",
        details={"path": "README.md"},
    )
    in_memory_db.add(audit)
    await in_memory_db.commit()

    result = await in_memory_db.execute(select(AuditEvent).where(AuditEvent.id == audit.id))
    retrieved = result.scalar_one()
    assert retrieved.event_type == "TOOL_EXECUTION"
    assert retrieved.details["path"] == "README.md"
