"""Execution Runs and Workflow Recovery API endpoints."""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.execution_run import ExecutionRun
from app.services.recovery_service import ExecutionRecoveryService

router = APIRouter(prefix="/runs", tags=["Execution Runs"])


class ExecutionRunResponse(BaseModel):
    """Schema for returning execution runs and history."""

    id: str
    conversation_id: str
    thread_id: str
    repo_name: str | None = None
    status: str
    user_request: str
    current_step: str | None = None
    step_history: list[dict[str, Any]]
    error_message: str | None = None
    retry_count: int
    created_at: datetime
    completed_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class RunActionRequest(BaseModel):
    """Schema for resuming or cancelling a run."""

    reason: str | None = None


@router.get("", response_model=list[ExecutionRunResponse])
async def list_runs(
    status: str | None = Query(
        None,
        description="Filter by status (RUNNING, WAITING_APPROVAL, COMPLETED, FAILED, INTERRUPTED, CANCELLED)",
    ),
    conversation_id: str | None = Query(None, description="Filter by conversation ID"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List execution runs with status and conversation filtering."""
    service = ExecutionRecoveryService(db)
    return await service.list_runs(conversation_id=conversation_id, status=status, limit=limit)


@router.get("/interrupted", response_model=list[ExecutionRunResponse])
async def detect_interrupted_runs(db: AsyncSession = Depends(get_db)):
    """Detect and transition any runs interrupted by backend shutdown or restart."""
    service = ExecutionRecoveryService(db)
    return await service.detect_and_handle_interrupted_runs()


@router.get("/{run_id}", response_model=ExecutionRunResponse)
async def get_run_details(run_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve full execution timeline, steps, and diagnostic history for a run."""
    result = await db.execute(select(ExecutionRun).where(ExecutionRun.id == run_id))
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Execution run not found")
    return run


@router.post("/{run_id}/resume", response_model=ExecutionRunResponse)
async def resume_run(
    run_id: str,
    _action: RunActionRequest | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Resume an interrupted or paused execution run."""
    service = ExecutionRecoveryService(db)
    try:
        return await service.resume_interrupted_run(run_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/{run_id}/cancel", response_model=ExecutionRunResponse)
async def cancel_run(
    run_id: str,
    action: RunActionRequest | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Safely cancel an active or paused execution run."""
    service = ExecutionRecoveryService(db)
    reason = action.reason if action and action.reason else "Cancelled by user"
    run = await service.cancel_run(run_id, reason=reason)
    if not run:
        raise HTTPException(status_code=404, detail="Execution run not found")
    return run
