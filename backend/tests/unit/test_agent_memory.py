"""Unit tests for Conversation Memory and Long-Term Workspace Memory Service."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base
from app.models.conversation import Conversation, ConversationMessage
from app.services.memory_service import MemoryService


@pytest.fixture
async def async_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        conv = Conversation(id="conv-mem", title="Memory Test Conversation")
        session.add(conv)
        await session.commit()
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_short_term_memory_redacts_secrets(async_db: AsyncSession):
    service = MemoryService(async_db)

    # Insert messages containing sensitive tokens
    msg1 = ConversationMessage(
        conversation_id="conv-mem",
        role="user",
        content="Here is my token: ghp_1234567890abcdefghijklmnopqrstuvwxyzAB and key sk-proj-1234567890abcdef1234567890abcdef",
    )
    msg2 = ConversationMessage(
        conversation_id="conv-mem",
        role="assistant",
        content="I have redacted your credentials safely.",
    )
    async_db.add_all([msg1, msg2])
    await async_db.commit()

    short_term = await service.get_short_term_messages("conv-mem")
    assert len(short_term) == 2
    # Verify tokens are not in memory
    assert "ghp_1234567890abcdefghijklmnopqrstuvwxyzAB" not in short_term[0]["content"]
    assert "[REDACTED_SECRET]" in short_term[0]["content"]


@pytest.mark.asyncio
async def test_save_and_retrieve_user_preferences(async_db: AsyncSession):
    service = MemoryService(async_db)

    # Save user preferences
    await service.save_user_preference(
        user_id="user-1",
        key="preferred_model",
        value="qwen2.5-coder:7b",
    )
    await service.save_user_preference(
        user_id="user-1",
        key="default_test_runner",
        value="pytest -v",
    )

    prefs = await service.get_user_preferences("user-1")
    assert prefs["preferred_model"] == "qwen2.5-coder:7b"
    assert prefs["default_test_runner"] == "pytest -v"

    # Update preference
    await service.save_user_preference(
        user_id="user-1",
        key="preferred_model",
        value="deepseek-r1:8b",
    )
    updated = await service.get_user_preferences("user-1")
    assert updated["preferred_model"] == "deepseek-r1:8b"


@pytest.mark.asyncio
async def test_record_task_summary_and_execution_references(async_db: AsyncSession):
    service = MemoryService(async_db)

    await service.record_task_summary(
        user_id="user-1",
        repo_name="octocat/Hello-World",
        task_title="Fix divide-by-zero bug",
        summary="Fixed ZeroDivisionError in calculator.py with token ghp_secret123456789012345678901234567890",
        execution_refs={"pr_number": 42, "branch": "fix/divide-zero", "commit_sha": "abc1234"},
    )

    history = await service.get_task_history("user-1", repo_name="octocat/Hello-World")
    assert len(history) == 1
    assert history[0]["repo"] == "octocat/Hello-World"
    assert history[0]["execution_refs"]["pr_number"] == 42
    # Ensure sensitive token in summary is redacted
    assert "ghp_secret" not in history[0]["summary"]
    assert "[REDACTED_SECRET]" in history[0]["summary"]


@pytest.mark.asyncio
async def test_long_term_memory_prompt_injection(async_db: AsyncSession):
    service = MemoryService(async_db)

    await service.save_user_preference("user-1", "code_style", "pep8")
    await service.record_task_summary(
        user_id="user-1",
        repo_name="org/repo",
        task_title="Add auth middleware",
        summary="Added JWT auth middleware to API",
        execution_refs={"pr": 101},
    )

    context = await service.build_long_term_memory_context("user-1", active_repo="org/repo")
    assert "LONG-TERM WORKSPACE MEMORY" in context
    assert "code_style: pep8" in context
    assert "Add auth middleware" in context
