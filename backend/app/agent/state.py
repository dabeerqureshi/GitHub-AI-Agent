"""AgentState definition for LangGraph state machine."""

from typing import Annotated, Any

from typing_extensions import TypedDict


def append_messages(
    existing: list[dict[str, Any]], new_messages: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Reducer that appends new messages to the message history."""
    return existing + new_messages


class AgentState(TypedDict):
    """The complete state managed by the LangGraph agent."""

    conversation_id: str
    messages: Annotated[list[dict[str, Any]], append_messages]
    active_repo: str | None
    intent: str | None
    plan: list[str]
    current_step: int
    tool_to_execute: dict[str, Any] | None
    pending_approval: dict[str, Any] | None
    approval_status: str | None
    tool_result: dict[str, Any] | None
    final_response: str | None
    error: str | None
