"""Chat and conversation management API endpoints with LangGraph orchestration and SSE streaming."""

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sse_starlette.sse import EventSourceResponse

from app.agent.graph import GitHubAgentWorkflow
from app.core.database import get_db
from app.models.audit import AuditEvent
from app.models.conversation import Conversation, ConversationMessage
from app.schemas.approval import ApprovalResponse
from app.schemas.chat import (
    ConversationCreate,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
)
from app.services.approval_service import ApprovalManager
from app.services.audit_service import AuditService

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
        "metadata": None,
    }

    final_state = await workflow.graph.ainvoke(initial_state)

    # Check if workflow paused for HITL approval
    pending = final_state.get("pending_approval")
    if pending and final_state.get("approval_status") == "PENDING":
        approval_manager = ApprovalManager(db)
        approval = await approval_manager.create_approval_request(
            conversation_id=conversation_id,
            tool_name=pending["tool_name"],
            step_id=pending["step_id"],
            description=pending["description"],
            payload=pending["arguments"],
            repo_name=conv.active_repo,
        )

        audit_service = AuditService(db)
        await audit_service.log_event(
            event_type="APPROVAL_REQUESTED",
            conversation_id=conversation_id,
            action_hash=pending["action_hash"],
            tool_name=pending["tool_name"],
            status="PENDING",
            details=pending,
        )

        return {
            "status": "NEEDS_APPROVAL",
            "approval": ApprovalResponse.model_validate(approval),
            "plan": final_state.get("plan", []),
            "metadata": final_state.get("metadata"),
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
        "metadata": final_state.get("metadata"),
    }


@router.post("/conversations/{conversation_id}/stream")
async def stream_message(
    conversation_id: str,
    payload: MessageCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Stream agent execution events using Server-Sent Events (SSE).

    Streams: status, plan updates, tool execution, tool results, approvals, and final response.
    """

    async def sse_generator():
        result = await db.execute(
            select(Conversation)
            .options(selectinload(Conversation.messages))
            .where(Conversation.id == conversation_id)
        )
        conv = result.scalar_one_or_none()
        if not conv:
            yield {"event": "error", "data": json.dumps({"detail": "Conversation not found"})}
            return

        if payload.active_repo:
            conv.active_repo = payload.active_repo

        user_msg = ConversationMessage(
            conversation_id=conversation_id,
            role="user",
            content=payload.content,
        )
        db.add(user_msg)
        await db.commit()

        history = [{"role": m.role, "content": m.content} for m in conv.messages]
        history.append({"role": "user", "content": payload.content})

        yield {
            "event": "status",
            "data": json.dumps(
                {"step": "PLANNING", "message": "Analyzing natural language instruction..."}
            ),
        }

        state = {
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
            "metadata": None,
        }

        # 1. Plan node
        plan_update = await workflow.plan_and_route(state)
        state.update(plan_update)
        yield {
            "event": "plan",
            "data": json.dumps({"plan": state["plan"], "intent": state["intent"]}),
        }

        # 2. Tool select node
        tool_update = await workflow.tool_selection(state)
        state.update(tool_update)

        tool = state.get("tool_to_execute")
        if tool:
            yield {
                "event": "status",
                "data": json.dumps({"step": "TOOL_SELECTED", "tool": tool["name"]}),
            }

            # 3. Approval gate
            appr_update = await workflow.approval_gate(state)
            state.update(appr_update)

            pending = state.get("pending_approval")
            if pending and state.get("approval_status") == "PENDING":
                approval_manager = ApprovalManager(db)
                approval = await approval_manager.create_approval_request(
                    conversation_id=conversation_id,
                    tool_name=pending["tool_name"],
                    step_id=pending["step_id"],
                    description=pending["description"],
                    payload=pending["arguments"],
                    repo_name=conv.active_repo,
                )

                audit_service = AuditService(db)
                await audit_service.log_event(
                    event_type="APPROVAL_REQUESTED",
                    conversation_id=conversation_id,
                    action_hash=pending["action_hash"],
                    tool_name=pending["tool_name"],
                    status="PENDING",
                    details=pending,
                )

                yield {
                    "event": "approval_required",
                    "data": json.dumps(
                        {
                            "approval": ApprovalResponse.model_validate(approval).model_dump(
                                mode="json"
                            )
                        }
                    ),
                }
                yield {
                    "event": "done",
                    "data": json.dumps({"status": "NEEDS_APPROVAL"}),
                }
                return

            # 4. Tool execution
            yield {
                "event": "tool_call",
                "data": json.dumps({"tool": tool["name"], "arguments": tool.get("arguments", {})}),
            }
            exec_update = await workflow.execute_tool(state)
            state.update(exec_update)

            yield {
                "event": "tool_result",
                "data": json.dumps({"tool": tool["name"], "result": state.get("tool_result")}),
            }

        # 5. Verification and Final Response
        yield {
            "event": "status",
            "data": json.dumps(
                {
                    "step": "VERIFYING",
                    "message": "Verifying actual GitHub results and formulating response...",
                }
            ),
        }

        resp_update = await workflow.verify_and_respond(state)
        state.update(resp_update)

        assistant_text = state.get("final_response") or "Instruction completed."
        assistant_msg = ConversationMessage(
            conversation_id=conversation_id,
            role="assistant",
            content=assistant_text,
        )
        db.add(assistant_msg)
        await db.commit()
        await db.refresh(assistant_msg)

        yield {
            "event": "response",
            "data": json.dumps(
                {
                    "content": assistant_text,
                    "message": MessageResponse.model_validate(assistant_msg).model_dump(
                        mode="json"
                    ),
                }
            ),
        }

        yield {
            "event": "done",
            "data": json.dumps({"status": "COMPLETED", "metadata": state.get("metadata")}),
        }

    return EventSourceResponse(sse_generator())


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
