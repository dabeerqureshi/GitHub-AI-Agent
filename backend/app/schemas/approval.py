"""Pydantic schemas for Human-in-the-Loop approval requests."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ApprovalDecision(BaseModel):
    """Schema for approving or rejecting a pending tool action."""

    action_hash: str = Field(..., description="Action signature hash must match exact payload")
    decision: str = Field(..., pattern="^(APPROVE|REJECT)$", description="APPROVE or REJECT")
    reviewer_notes: str | None = Field(None, description="Optional feedback or rejection reason")


class ApprovalResponse(BaseModel):
    """Schema for returning an approval request."""

    id: str
    conversation_id: str
    step_id: str
    tool_name: str
    action_hash: str
    description: str
    payload: dict[str, Any]
    status: str
    reviewer_notes: str | None = None
    created_at: datetime
    resolved_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
