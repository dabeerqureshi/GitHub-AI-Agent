"""Repository Context Snapshot model for incremental repository intelligence."""

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, generate_uuid, utc_now


class RepoContextSnapshot(Base, TimestampMixin):
    """Stores cached, incrementally refreshed repository intelligence."""

    __tablename__ = "repo_context_snapshots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    full_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    default_branch: Mapped[str] = mapped_column(String(64), default="main", nullable=False)
    last_indexed_commit_sha: Mapped[str | None] = mapped_column(
        String(40), nullable=True, index=True
    )

    languages: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    directory_tree: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    documentation_files: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, default=list, nullable=False
    )
    configuration_files: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, default=list, nullable=False
    )
    dependencies: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    symbols: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    architecture_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    last_refreshed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )
