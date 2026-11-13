"""Add phase 7 models: workspace_memories, execution_runs, and enhanced approval columns

Revision ID: 003_phase7_approval_and_memory
Revises: 002_repo_context_snapshots
Create Date: 2026-11-14 02:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "003_phase7_approval_and_memory"
down_revision: str | None = "002_repo_context_snapshots"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create workspace_memories
    op.create_table(
        "workspace_memories",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=64), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("key", sa.String(length=255), nullable=False),
        sa.Column("value", sa.JSON(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workspace_memories_user_id", "workspace_memories", ["user_id"])
    op.create_index("ix_workspace_memories_category", "workspace_memories", ["category"])
    op.create_index("ix_workspace_memories_key", "workspace_memories", ["key"])

    # 2. Create execution_runs
    op.create_table(
        "execution_runs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("conversation_id", sa.String(length=36), nullable=False),
        sa.Column("thread_id", sa.String(length=64), nullable=False),
        sa.Column("repo_name", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("user_request", sa.Text(), nullable=False),
        sa.Column("current_step", sa.String(length=128), nullable=True),
        sa.Column("step_history", sa.JSON(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_execution_runs_conversation_id", "execution_runs", ["conversation_id"])
    op.create_index("ix_execution_runs_thread_id", "execution_runs", ["thread_id"])
    op.create_index("ix_execution_runs_status", "execution_runs", ["status"])

    # 3. Add columns to approval_requests
    with op.batch_alter_table("approval_requests", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("user_id", sa.String(length=64), nullable=False, server_default="local-user")
        )
        batch_op.add_column(sa.Column("repo_name", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("execution_nonce", sa.String(length=64), nullable=True))
        batch_op.add_column(
            sa.Column("is_executed", sa.Boolean(), nullable=False, server_default="0")
        )
        batch_op.add_column(sa.Column("executed_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.create_index("ix_approval_requests_user_id", ["user_id"])
        batch_op.create_index("ix_approval_requests_repo_name", ["repo_name"])
        batch_op.create_index(
            "ix_approval_requests_execution_nonce", ["execution_nonce"], unique=True
        )


def downgrade() -> None:
    with op.batch_alter_table("approval_requests", schema=None) as batch_op:
        batch_op.drop_index("ix_approval_requests_execution_nonce")
        batch_op.drop_index("ix_approval_requests_repo_name")
        batch_op.drop_index("ix_approval_requests_user_id")
        batch_op.drop_column("executed_at")
        batch_op.drop_column("is_executed")
        batch_op.drop_column("execution_nonce")
        batch_op.drop_column("expires_at")
        batch_op.drop_column("repo_name")
        batch_op.drop_column("user_id")

    op.drop_index("ix_execution_runs_status", table_name="execution_runs")
    op.drop_index("ix_execution_runs_thread_id", table_name="execution_runs")
    op.drop_index("ix_execution_runs_conversation_id", table_name="execution_runs")
    op.drop_table("execution_runs")

    op.drop_index("ix_workspace_memories_key", table_name="workspace_memories")
    op.drop_index("ix_workspace_memories_category", table_name="workspace_memories")
    op.drop_index("ix_workspace_memories_user_id", table_name="workspace_memories")
    op.drop_table("workspace_memories")
