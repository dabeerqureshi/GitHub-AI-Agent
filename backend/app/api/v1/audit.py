"""Audit trail querying API endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.audit import AuditEvent
from app.schemas.audit import AuditEventResponse

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("", response_model=list[AuditEventResponse])
async def list_audit_events(
    event_type: str | None = Query(None, description="Filter by event type"),
    conversation_id: str | None = Query(None, description="Filter by conversation ID"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve immutable audit events for security and compliance review."""
    query = select(AuditEvent).order_by(AuditEvent.timestamp.desc())

    if event_type:
        query = query.where(AuditEvent.event_type == event_type)
    if conversation_id:
        query = query.where(AuditEvent.conversation_id == conversation_id)

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
