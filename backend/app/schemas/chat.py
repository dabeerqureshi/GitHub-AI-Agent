"""Pydantic schemas for chat conversations and messages."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class MessageCreate(BaseModel):
    """Schema for sending a new message in a conversation."""

    content: str = Field(..., min_length=1, description="The message content from user")
    active_repo: str | None = Field(None, description="Target repository context, e.g. owner/repo")


class MessageResponse(BaseModel):
    """Schema for returning a conversation message."""

    id: str
    conversation_id: str
    role: str
    content: str
    tool_calls: list[dict[str, Any]] | None = None
    tool_call_id: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationCreate(BaseModel):
    """Schema for creating a new conversation."""

    title: str | None = Field("New Chat", description="Title of the conversation")
    active_repo: str | None = Field(None, description="Associated GitHub repository")


class ConversationResponse(BaseModel):
    """Schema for returning conversation details."""

    id: str
    title: str
    active_repo: str | None = None
    created_at: datetime
    updated_at: datetime
    messages: list[MessageResponse] = []

    model_config = ConfigDict(from_attributes=True)
