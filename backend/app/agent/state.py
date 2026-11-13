"""AgentState and structured models for LangGraph state machine."""

from typing import Annotated, Any

from pydantic import BaseModel, Field
from typing_extensions import TypedDict


def append_messages(
    existing: list[dict[str, Any]], new_messages: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Reducer that appends new messages to the message history."""
    return existing + new_messages


class IntentAnalysis(BaseModel):
    """Structured intent classification and target repository resolution."""

    intent: str = Field(..., description="Normalized intent type")
    target_repo: str | None = Field(None, description="Resolved target repository owner/name")
    confidence: float = Field(1.0, description="Confidence score")
    requires_mutation: bool = Field(False, description="Whether intent requires write approval")
    extracted_parameters: dict[str, Any] = Field(default_factory=dict)


class AgentExecutionMetadata(BaseModel):
    """Metadata tracking agent execution latency, model provider, and steps."""

    provider: str
    model: str
    total_duration_seconds: float = 0.0
    tool_calls_executed: int = 0
    checkpoint_id: str | None = None


class AgentState(TypedDict):
    """The complete typed state managed by the LangGraph agent."""

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
    metadata: dict[str, Any] | None
