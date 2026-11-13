"""Add repo_context_snapshots table

Revision ID: 002_repo_context_snapshots
Revises: 001_initial_schema
Create Date: 2026-11-14 01:20:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "002_repo_context_snapshots"
down_revision: str | None = "001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "repo_context_snapshots",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("default_branch", sa.String(length=64), nullable=False),
        sa.Column("last_indexed_commit_sha", sa.String(length=40), nullable=True),
        sa.Column("languages", sa.JSON(), nullable=False),
        sa.Column("directory_tree", sa.JSON(), nullable=False),
        sa.Column("documentation_files", sa.JSON(), nullable=False),
        sa.Column("configuration_files", sa.JSON(), nullable=False),
        sa.Column("dependencies", sa.JSON(), nullable=False),
        sa.Column("symbols", sa.JSON(), nullable=False),
        sa.Column("architecture_summary", sa.Text(), nullable=True),
        sa.Column("last_refreshed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_repo_context_snapshots_full_name", "repo_context_snapshots", ["full_name"], unique=True
    )
    op.create_index(
        "ix_repo_context_snapshots_last_indexed_commit_sha",
        "repo_context_snapshots",
        ["last_indexed_commit_sha"],
    )


def downgrade() -> None:
    op.drop_table("repo_context_snapshots")
