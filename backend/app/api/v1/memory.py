"""Long-term Memory and User Preferences API endpoints."""

from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.memory_service import MemoryService

router = APIRouter(prefix="/memory", tags=["Memory"])


class PreferenceUpdate(BaseModel):
    """Schema for updating a user preference."""

    key: str
    value: Any
    summary: str | None = None


class MemoryResponse(BaseModel):
    """Schema for returning workspace memories."""

    id: str
    user_id: str
    category: str
    key: str
    value: dict[str, Any]
    summary: str | None = None

    model_config = ConfigDict(from_attributes=True)


@router.get("/preferences")
async def get_preferences(
    user_id: str = Query("local-user"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all user preferences from long-term memory."""
    service = MemoryService(db)
    return await service.get_user_preferences(user_id)


@router.post("/preferences", response_model=MemoryResponse)
async def set_preference(
    pref: PreferenceUpdate,
    user_id: str = Query("local-user"),
    db: AsyncSession = Depends(get_db),
):
    """Persist or update a user preference."""
    service = MemoryService(db)
    return await service.save_user_preference(
        user_id=user_id,
        key=pref.key,
        value=pref.value,
        summary=pref.summary,
    )


@router.get("/tasks")
async def get_task_history(
    user_id: str = Query("local-user"),
    repo: str | None = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve historical task summaries and execution references."""
    service = MemoryService(db)
    return await service.get_task_history(user_id=user_id, repo_name=repo, limit=limit)


@router.get("/context")
async def get_long_term_context(
    user_id: str = Query("local-user"),
    repo: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get the sanitized long-term memory context prompt."""
    service = MemoryService(db)
    context_text = await service.build_long_term_memory_context(user_id=user_id, active_repo=repo)
    return {"context": context_text}
