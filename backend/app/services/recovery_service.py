"""Execution Recovery, Workflow State Checkpointing, and Idempotency Management."""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import utc_now
from app.models.execution_run import ExecutionRun, ExecutionStatus


class ExecutionRecoveryService:
    """Manages execution runs, restart recovery, safe retries, and duplicate action protection."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._action_idempotency_cache: set[str] = set()

    async def create_run(
        self,
        conversation_id: str,
        thread_id: str,
        user_request: str,
        repo_name: str | None = None,
    ) -> ExecutionRun:
        """Initialize an execution run for tracking step history and crash recovery."""
        run = ExecutionRun(
            conversation_id=conversation_id,
            thread_id=thread_id,
            repo_name=repo_name,
            status=ExecutionStatus.RUNNING.value,
            user_request=user_request,
            current_step="plan_and_route",
            step_history=[
                {"step": "created", "status": "PENDING", "timestamp": utc_now().isoformat()}
            ],
        )
        self.db.add(run)
        await self.db.commit()
        await self.db.refresh(run)
        return run

    async def record_step(
        self,
        run_id: str,
        step_name: str,
        status: str = "IN_PROGRESS",
        details: dict[str, Any] | None = None,
    ) -> ExecutionRun | None:
        """Record an execution step transition with metadata."""
        result = await self.db.execute(select(ExecutionRun).where(ExecutionRun.id == run_id))
        run = result.scalar_one_or_none()
        if not run:
            return None

        history = list(run.step_history)
        history.append(
            {
                "step": step_name,
                "status": status,
                "details": details or {},
                "timestamp": datetime.now(UTC).isoformat(),
            }
        )
        run.step_history = history
        run.current_step = step_name

        if status == "WAITING_APPROVAL":
            run.status = ExecutionStatus.WAITING_APPROVAL.value

        await self.db.commit()
        await self.db.refresh(run)
        return run

    async def complete_run(self, run_id: str) -> ExecutionRun | None:
        """Mark an execution run as successfully completed."""
        result = await self.db.execute(select(ExecutionRun).where(ExecutionRun.id == run_id))
        run = result.scalar_one_or_none()
        if not run:
            return None

        run.status = ExecutionStatus.COMPLETED.value
        run.completed_at = datetime.now(UTC)
        await self.db.commit()
        await self.db.refresh(run)
        return run

    async def fail_run(self, run_id: str, error_message: str) -> ExecutionRun | None:
        """Mark an execution run as failed with diagnostic error details."""
        result = await self.db.execute(select(ExecutionRun).where(ExecutionRun.id == run_id))
        run = result.scalar_one_or_none()
        if not run:
            return None

        run.status = ExecutionStatus.FAILED.value
        run.error_message = error_message
        run.completed_at = datetime.now(UTC)
        await self.db.commit()
        await self.db.refresh(run)
        return run

    async def cancel_run(
        self, run_id: str, reason: str = "User cancelled execution"
    ) -> ExecutionRun | None:
        """Safely cancel an active or paused execution run."""
        result = await self.db.execute(select(ExecutionRun).where(ExecutionRun.id == run_id))
        run = result.scalar_one_or_none()
        if not run:
            return None

        run.status = ExecutionStatus.CANCELLED.value
        run.error_message = reason
        run.completed_at = datetime.now(UTC)
        await self.db.commit()
        await self.db.refresh(run)
        return run

    async def detect_and_handle_interrupted_runs(self) -> list[ExecutionRun]:
        """Scan for orphaned runs left in RUNNING across backend restarts and transition to INTERRUPTED."""
        result = await self.db.execute(
            select(ExecutionRun).where(ExecutionRun.status == ExecutionStatus.RUNNING.value)
        )
        orphaned = list(result.scalars().all())

        for run in orphaned:
            run.status = ExecutionStatus.INTERRUPTED.value
            run.error_message = "Execution interrupted due to backend restart or shutdown."
            history = list(run.step_history)
            history.append(
                {
                    "step": "restart_detection",
                    "status": "INTERRUPTED",
                    "message": "Backend restarted while run was in progress.",
                    "timestamp": datetime.now(UTC).isoformat(),
                }
            )
            run.step_history = history

        if orphaned:
            await self.db.commit()
        return orphaned

    async def resume_interrupted_run(self, run_id: str) -> ExecutionRun:
        """Mark an interrupted or paused run as resumed for re-execution."""
        result = await self.db.execute(select(ExecutionRun).where(ExecutionRun.id == run_id))
        run = result.scalar_one_or_none()
        if not run:
            raise ValueError(f"Run '{run_id}' not found.")

        if run.status not in (
            ExecutionStatus.INTERRUPTED.value,
            ExecutionStatus.WAITING_APPROVAL.value,
        ):
            raise ValueError(f"Cannot resume run with status: {run.status}")

        run.status = ExecutionStatus.RUNNING.value
        run.retry_count += 1
        history = list(run.step_history)
        history.append(
            {
                "step": "resumed",
                "status": "RUNNING",
                "timestamp": datetime.now(UTC).isoformat(),
            }
        )
        run.step_history = history
        await self.db.commit()
        await self.db.refresh(run)
        return run

    async def list_runs(
        self,
        conversation_id: str | None = None,
        status: str | None = None,
        limit: int = 50,
    ) -> list[ExecutionRun]:
        """List execution runs with status and conversation filtering."""
        query = select(ExecutionRun).order_by(ExecutionRun.created_at.desc()).limit(limit)
        if conversation_id:
            query = query.where(ExecutionRun.conversation_id == conversation_id)
        if status:
            query = query.where(ExecutionRun.status == status)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    def check_and_claim_idempotency(self, idempotency_key: str) -> bool:
        """Protect against duplicate action execution; returns True if claimed, False if already executed."""
        if idempotency_key in self._action_idempotency_cache:
            return False
        self._action_idempotency_cache.add(idempotency_key)
        return True
