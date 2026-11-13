"""Chat and conversation management API endpoints with LangGraph orchestration."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.agent.graph import GitHubAgentWorkflow
from app.core.database import get_db
from app.models.approval import ApprovalRequest, ApprovalStatus
from app.models.audit import AuditEvent
from app.models.conversation import Conversation, ConversationMessage
from app.schemas.approval import ApprovalResponse
from app.schemas.chat import (
    ConversationCreate,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
)

router = APIRouter(prefix="/chat", tags=["Chat"])
workflow = GitHubAgentWorkflow()


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(db: AsyncSession = Depends(get_db)):
    """List all user conversations."""
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .order_by(Conversation.updated_at.desc())
    )
    return result.scalars().all()


@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    payload: ConversationCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new chat conversation."""
    conversation = Conversation(
        title=payload.title or "New Workspace Chat",
        active_repo=payload.active_repo,
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)

    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation.id)
    )
    return result.scalar_one()


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get full details of a specific conversation with all historical messages."""
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    payload: MessageCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message in a conversation and execute the LangGraph agent workflow.

    Returns the assistant message or pauses with an interactive ApprovalRequest if mutating.
    """
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if payload.active_repo:
        conv.active_repo = payload.active_repo

    # Save user message
    user_msg = ConversationMessage(
        conversation_id=conversation_id,
        role="user",
        content=payload.content,
    )
    db.add(user_msg)
    await db.commit()

    # Build historical message format for agent
    history = [{"role": m.role, "content": m.content} for m in conv.messages]
    history.append({"role": "user", "content": payload.content})

    # Execute LangGraph workflow
    initial_state = {
        "conversation_id": conversation_id,
        "messages": history,
        "active_repo": conv.active_repo,
        "intent": None,
        "plan": [],
        "current_step": len(history),
        "tool_to_execute": None,
        "pending_approval": None,
        "approval_status": None,
        "tool_result": None,
        "final_response": None,
        "error": None,
    }

    final_state = await workflow.graph.ainvoke(initial_state)

    # Check if workflow paused for HITL approval
    pending = final_state.get("pending_approval")
    if pending and final_state.get("approval_status") == "PENDING":
        approval = ApprovalRequest(
            conversation_id=conversation_id,
            step_id=pending["step_id"],
            tool_name=pending["tool_name"],
            action_hash=pending["action_hash"],
            description=pending["description"],
            payload=pending["arguments"],
            status=ApprovalStatus.PENDING.value,
        )
        db.add(approval)

        audit = AuditEvent(
            event_type="APPROVAL_REQUESTED",
            conversation_id=conversation_id,
            action_hash=pending["action_hash"],
            tool_name=pending["tool_name"],
            status="PENDING",
            details=pending,
        )
        db.add(audit)
        await db.commit()
        await db.refresh(approval)

        return {
            "status": "NEEDS_APPROVAL",
            "approval": ApprovalResponse.model_validate(approval),
            "plan": final_state.get("plan", []),
        }

    # Otherwise save assistant response
    assistant_text = final_state.get("final_response") or "Instruction processed."
    assistant_msg = ConversationMessage(
        conversation_id=conversation_id,
        role="assistant",
        content=assistant_text,
    )
    db.add(assistant_msg)

    audit = AuditEvent(
        event_type="AGENT_EXECUTION_COMPLETED",
        conversation_id=conversation_id,
        status="SUCCESS",
        details={
            "intent": final_state.get("intent"),
            "tool": final_state.get("tool_to_execute"),
        },
    )
    db.add(audit)
    await db.commit()
    await db.refresh(assistant_msg)

    return {
        "status": "COMPLETED",
        "message": MessageResponse.model_validate(assistant_msg),
        "plan": final_state.get("plan", []),
    }


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a conversation and all its messages."""
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.delete(conv)
    await db.commit()
    return {"status": "deleted", "id": conversation_id}
