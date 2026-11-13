"""Unit tests for Execution Recovery, Restart Detection, Idempotency, and LangGraph Checkpoint Persistence."""

import tempfile
from pathlib import Path

import pytest
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.agent.graph import GitHubAgentWorkflow
from app.core.database import Base
from app.models.conversation import Conversation
from app.models.execution_run import ExecutionStatus
from app.services.recovery_service import ExecutionRecoveryService


@pytest.fixture
async def async_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        conv = Conversation(id="conv-recov", title="Recovery Test")
        session.add(conv)
        await session.commit()
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_create_and_track_execution_steps(async_db: AsyncSession):
    service = ExecutionRecoveryService(async_db)

    run = await service.create_run(
        conversation_id="conv-recov",
        thread_id="thread-101",
        user_request="Investigate issue #42",
        repo_name="octocat/Hello-World",
    )
    assert run.id is not None
    assert run.status == ExecutionStatus.RUNNING.value
    assert len(run.step_history) == 1

    # Record intermediate step
    updated = await service.record_step(
        run_id=run.id,
        step_name="tool_selection",
        status="EXECUTING",
        details={"tool": "get_issue"},
    )
    assert updated is not None
    assert len(updated.step_history) == 2
    assert updated.current_step == "tool_selection"

    # Complete run
    completed = await service.complete_run(run.id)
    assert completed is not None
    assert completed.status == ExecutionStatus.COMPLETED.value
    assert completed.completed_at is not None


@pytest.mark.asyncio
async def test_restart_recovery_detects_interrupted_runs(async_db: AsyncSession):
    service = ExecutionRecoveryService(async_db)

    # Simulate a run that was active when server crashed or restarted
    run = await service.create_run(
        conversation_id="conv-recov",
        thread_id="thread-orphaned",
        user_request="Run complex coding task",
    )
    assert run.status == ExecutionStatus.RUNNING.value

    # Simulate server reboot: run restart detection
    interrupted = await service.detect_and_handle_interrupted_runs()
    assert len(interrupted) == 1
    assert interrupted[0].id == run.id
    assert interrupted[0].status == ExecutionStatus.INTERRUPTED.value
    assert "interrupted" in interrupted[0].error_message.lower()


@pytest.mark.asyncio
async def test_resume_and_cancel_interrupted_run(async_db: AsyncSession):
    service = ExecutionRecoveryService(async_db)

    run = await service.create_run(
        conversation_id="conv-recov",
        thread_id="thread-resume",
        user_request="Refactor auth",
    )
    await service.detect_and_handle_interrupted_runs()

    # Resume the interrupted run
    resumed = await service.resume_interrupted_run(run.id)
    assert resumed.status == ExecutionStatus.RUNNING.value
    assert resumed.retry_count == 1

    # Now cancel the run
    cancelled = await service.cancel_run(run.id, reason="User decided to abort")
    assert cancelled is not None
    assert cancelled.status == ExecutionStatus.CANCELLED.value
    assert "abort" in cancelled.error_message


@pytest.mark.asyncio
async def test_idempotency_duplicate_action_protection(async_db: AsyncSession):
    service = ExecutionRecoveryService(async_db)

    action_nonce = "action-nonce-999"
    # First attempt claims the idempotency key successfully
    assert service.check_and_claim_idempotency(action_nonce) is True

    # Immediate duplicate execution attempt is rejected
    assert service.check_and_claim_idempotency(action_nonce) is False


@pytest.mark.asyncio
async def test_langgraph_sqlite_checkpoint_persistence_across_sessions():
    """Verify LangGraph persists checkpoints to SQLite and recovers state across process lifecycles."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        db_path = str(Path(tmp_dir) / "checkpoints.sqlite")

        # 1. First session: run workflow with SQLite checkpointer
        config = {"configurable": {"thread_id": "thread-persistent-1"}}
        initial_state = {
            "conversation_id": "conv-test",
            "messages": [{"role": "user", "content": "Show my repositories"}],
            "active_repo": None,
            "intent": None,
            "plan": [],
            "current_step": 1,
            "tool_to_execute": None,
            "pending_approval": None,
            "approval_status": None,
            "tool_result": None,
            "final_response": None,
            "error": None,
            "metadata": None,
        }

        async with AsyncSqliteSaver.from_conn_string(db_path) as saver1:
            workflow = GitHubAgentWorkflow(checkpointer=saver1)
            result = await workflow.graph.ainvoke(initial_state, config=config)
            assert result["final_response"] is not None

        # 2. Second session (simulating backend restart): reconnect to same SQLite file
        async with AsyncSqliteSaver.from_conn_string(db_path) as saver2:
            workflow2 = GitHubAgentWorkflow(checkpointer=saver2)
            recovered_state = await workflow2.graph.aget_state(config)

            assert recovered_state is not None
            assert recovered_state.values.get("conversation_id") == "conv-test"
            assert recovered_state.values.get("final_response") == result["final_response"]
