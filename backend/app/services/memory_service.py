"""Conversation Memory and Long-Term Workspace Memory Service."""

from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import redact_secrets
from app.models.conversation import ConversationMessage
from app.models.memory import WorkspaceMemory


class MemoryService:
    """Manages short-term conversation history and long-term workspace memory."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ---------------------------------------------------------
    # Short-Term Conversation Memory
    # ---------------------------------------------------------

    async def get_short_term_messages(
        self,
        conversation_id: str,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """Retrieve recent conversation messages with secret redaction applied."""
        result = await self.db.execute(
            select(ConversationMessage)
            .where(ConversationMessage.conversation_id == conversation_id)
            .order_by(ConversationMessage.created_at.asc())
            .limit(limit)
        )
        messages = result.scalars().all()

        sanitized: list[dict[str, Any]] = []
        for m in messages:
            sanitized.append(
                {
                    "id": m.id,
                    "role": m.role,
                    "content": redact_secrets(m.content),
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                    "tool_calls": m.tool_calls,
                }
            )
        return sanitized

    # ---------------------------------------------------------
    # Long-Term Workspace Memory & User Preferences
    # ---------------------------------------------------------

    async def save_user_preference(
        self,
        user_id: str,
        key: str,
        value: Any,
        summary: str | None = None,
    ) -> WorkspaceMemory:
        """Persist or update a user preference in long-term memory."""
        result = await self.db.execute(
            select(WorkspaceMemory).where(
                WorkspaceMemory.user_id == user_id,
                WorkspaceMemory.category == "preferences",
                WorkspaceMemory.key == key,
            )
        )
        mem = result.scalar_one_or_none()

        val_dict = value if isinstance(value, dict) else {"value": value}
        if mem:
            mem.value = val_dict
            mem.summary = summary or f"User preference for '{key}'"
        else:
            mem = WorkspaceMemory(
                user_id=user_id,
                category="preferences",
                key=key,
                value=val_dict,
                summary=summary or f"User preference for '{key}'",
            )
            self.db.add(mem)

        await self.db.commit()
        await self.db.refresh(mem)
        return mem

    async def get_user_preferences(self, user_id: str = "local-user") -> dict[str, Any]:
        """Retrieve all active preferences for the user."""
        result = await self.db.execute(
            select(WorkspaceMemory).where(
                WorkspaceMemory.user_id == user_id,
                WorkspaceMemory.category == "preferences",
            )
        )
        memories = result.scalars().all()
        prefs: dict[str, Any] = {}
        for m in memories:
            val = m.value.get("value") if "value" in m.value and len(m.value) == 1 else m.value
            prefs[m.key] = val
        return prefs

    async def record_task_summary(
        self,
        user_id: str,
        repo_name: str,
        task_title: str,
        summary: str,
        execution_refs: dict[str, Any] | None = None,
    ) -> WorkspaceMemory:
        """Persist completed task summary and execution references into long-term memory."""
        clean_summary = redact_secrets(summary)
        clean_refs = execution_refs or {}

        mem = WorkspaceMemory(
            user_id=user_id,
            category="task_summary",
            key=f"{repo_name}:{task_title[:50]}",
            value={
                "repo": repo_name,
                "title": task_title,
                "execution_refs": clean_refs,
            },
            summary=clean_summary,
        )
        self.db.add(mem)
        await self.db.commit()
        await self.db.refresh(mem)
        return mem

    async def get_task_history(
        self,
        user_id: str = "local-user",
        repo_name: str | None = None,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        """Retrieve historical task summaries and execution references."""
        query = (
            select(WorkspaceMemory)
            .where(
                WorkspaceMemory.user_id == user_id,
                WorkspaceMemory.category == "task_summary",
            )
            .order_by(WorkspaceMemory.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(query)
        memories = result.scalars().all()

        history = []
        for m in memories:
            if repo_name and m.value.get("repo") != repo_name:
                continue
            history.append(
                {
                    "id": m.id,
                    "repo": m.value.get("repo"),
                    "title": m.value.get("title"),
                    "summary": m.summary,
                    "execution_refs": m.value.get("execution_refs", {}),
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
            )
        return history

    async def build_long_term_memory_context(
        self,
        user_id: str = "local-user",
        active_repo: str | None = None,
    ) -> str:
        """Construct structured long-term memory prompt context with safe secrets redaction."""
        prefs = await self.get_user_preferences(user_id)
        tasks = await self.get_task_history(user_id, repo_name=active_repo, limit=5)

        lines = ["--- LONG-TERM WORKSPACE MEMORY ---"]
        if prefs:
            lines.append("User Preferences:")
            for k, v in prefs.items():
                lines.append(f"- {k}: {v}")

        if tasks:
            lines.append("Recent Completed Tasks:")
            for t in tasks:
                refs_str = ""
                if t.get("execution_refs"):
                    refs = ", ".join(f"{rk}={rv}" for rk, rv in t["execution_refs"].items())
                    refs_str = f" [{refs}]"
                lines.append(f"- [{t.get('repo')}] {t.get('title')}: {t.get('summary')}{refs_str}")

        lines.append("-----------------------------------")
        return "\n".join(lines)
