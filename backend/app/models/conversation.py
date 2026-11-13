"""Conversation and Message models for state tracking."""

from typing import Any

from sqlalchemy import JSON, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class Conversation(Base, TimestampMixin):
    """Represents a persistent user chat session."""

    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    title: Mapped[str] = mapped_column(String(255), default="New Workspace Chat")
    active_repo: Mapped[str | None] = mapped_column(String(255), nullable=True)

    messages: Mapped[list["ConversationMessage"]] = relationship(
        "ConversationMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ConversationMessage.created_at",
    )
    approvals: Mapped[list["ApprovalRequest"]] = relationship(  # noqa: F821
        "ApprovalRequest",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )
    runs: Mapped[list["ExecutionRun"]] = relationship(  # noqa: F821
        "ExecutionRun",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )


class ConversationMessage(Base, TimestampMixin):
    """Represents a single message or tool event in a conversation."""

    __tablename__ = "conversation_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    conversation_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(32), nullable=False)  # user, assistant, system, tool
    content: Mapped[str] = mapped_column(Text, default="", nullable=False)
    tool_calls: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)
    tool_call_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    name: Mapped[str | None] = mapped_column(String(128), nullable=True)

    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages")
