"""Pydantic schemas for audit log querying."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class AuditEventResponse(BaseModel):
    """Schema for returning an audit event."""

    id: str
    timestamp: datetime
    event_type: str
    conversation_id: str | None = None
    action_hash: str | None = None
    tool_name: str | None = None
    status: str
    client_ip: str | None = None
    details: dict[str, Any]
    error_message: str | None = None

    model_config = ConfigDict(from_attributes=True)
