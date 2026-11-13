"""WorkspaceMemory model for long-term memory, user preferences, and task summaries."""

from typing import Any

from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid


class WorkspaceMemory(Base, TimestampMixin):
    """Long-term memory for user preferences, repository insights, task summaries, and execution references."""

    __tablename__ = "workspace_memories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(
        String(64), default="local-user", nullable=False, index=True
    )
    category: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )  # preferences, task_summary, execution_ref, repo_insight
    key: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    value: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
