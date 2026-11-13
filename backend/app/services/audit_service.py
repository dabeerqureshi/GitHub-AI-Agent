"""Centralized Audit Service with Sensitive Secret Redaction and Integrity Tracking."""

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import redact_secrets
from app.models.audit import AuditEvent
from app.models.base import utc_now


def _sanitize_payload(payload: Any) -> Any:
    """Recursively redact secrets from nested dictionaries, lists, and strings."""
    if isinstance(payload, str):
        return redact_secrets(payload)
    if isinstance(payload, dict):
        sanitized = {}
        for k, v in payload.items():
            if any(term in k.lower() for term in ("token", "secret", "key", "password", "auth")):
                sanitized[k] = "[REDACTED]"
            else:
                sanitized[k] = _sanitize_payload(v)
        return sanitized
    if isinstance(payload, list):
        return [_sanitize_payload(item) for item in payload]
    return payload


class AuditService:
    """Manages immutable audit logging for user requests, AI tool operations, and approval decisions."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_event(
        self,
        event_type: str,
        conversation_id: str | None = None,
        tool_name: str | None = None,
        action_hash: str | None = None,
        status: str = "SUCCESS",
        details: dict[str, Any] | None = None,
        error_message: str | None = None,
        client_ip: str | None = None,
    ) -> AuditEvent:
        """Create a sanitized audit event."""
        clean_details = _sanitize_payload(details or {})
        clean_error = redact_secrets(error_message) if error_message else None

        event = AuditEvent(
            timestamp=utc_now(),
            event_type=event_type,
            conversation_id=conversation_id,
            tool_name=tool_name,
            action_hash=action_hash,
            status=status,
            client_ip=client_ip,
            details=clean_details,
            error_message=clean_error,
        )
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def log_ai_turn(
        self,
        conversation_id: str,
        user_request: str,
        provider: str,
        model_name: str,
        selected_tools: list[str],
        status: str = "SUCCESS",
        external_op_id: str | None = None,
    ) -> AuditEvent:
        """Log an AI model orchestration turn with model identity and tools used."""
        return await self.log_event(
            event_type="AI_ORCHESTRATION",
            conversation_id=conversation_id,
            status=status,
            details={
                "user_request": redact_secrets(user_request),
                "model_provider": provider,
                "model_name": model_name,
                "selected_tools": selected_tools,
                "external_operation_id": external_op_id,
            },
        )

    async def log_approval_decision(
        self,
        approval_id: str,
        conversation_id: str,
        decision: str,
        user_id: str,
        action_hash: str,
        tool_name: str,
        reviewer_notes: str | None = None,
    ) -> AuditEvent:
        """Log a human-in-the-loop approval decision."""
        return await self.log_event(
            event_type="APPROVAL_DECISION",
            conversation_id=conversation_id,
            action_hash=action_hash,
            tool_name=tool_name,
            status=decision,
            details={
                "approval_id": approval_id,
                "user_id": user_id,
                "decision": decision,
                "reviewer_notes": redact_secrets(reviewer_notes) if reviewer_notes else None,
            },
        )

    async def list_events(
        self,
        conversation_id: str | None = None,
        event_type: str | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[AuditEvent]:
        """Query audit log events with filtering."""
        query = select(AuditEvent).order_by(AuditEvent.timestamp.desc()).offset(offset).limit(limit)
        if conversation_id:
            query = query.where(AuditEvent.conversation_id == conversation_id)
        if event_type:
            query = query.where(AuditEvent.event_type == event_type)
        if status:
            query = query.where(AuditEvent.status == status)

        result = await self.db.execute(query)
        return list(result.scalars().all())
