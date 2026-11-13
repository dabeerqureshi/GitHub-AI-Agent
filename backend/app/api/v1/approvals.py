"""Human-in-the-Loop approvals API endpoints with Centralized Security Enforcement."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.graph import GitHubAgentWorkflow
from app.core.database import get_db
from app.models.approval import ApprovalStatus
from app.models.conversation import ConversationMessage
from app.schemas.approval import ApprovalDecision, ApprovalResponse
from app.services.approval_service import (
    ApprovalExpiredException,
    ApprovalManager,
    ApprovalTamperedException,
    DuplicateActionException,
    UnauthorizedApprovalException,
)
from app.services.audit_service import AuditService

router = APIRouter(prefix="/approvals", tags=["Approvals"])
workflow = GitHubAgentWorkflow()


@router.get("", response_model=list[ApprovalResponse])
async def list_all_approvals(
    status: str | None = Query(
        None, description="Filter by status (PENDING, APPROVED, REJECTED, EXPIRED, EXECUTED)"
    ),
    conversation_id: str | None = Query(None, description="Filter by conversation ID"),
    user_id: str | None = Query(None, description="Filter by user ID"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List approval requests with filtering across all statuses."""
    manager = ApprovalManager(db)
    return await manager.list_approvals(
        conversation_id=conversation_id, status=status, user_id=user_id, limit=limit
    )


@router.get("/pending", response_model=list[ApprovalResponse])
async def list_pending_approvals(db: AsyncSession = Depends(get_db)):
    """List all pending approval requests requiring human confirmation."""
    manager = ApprovalManager(db)
    return await manager.list_approvals(status=ApprovalStatus.PENDING.value)


@router.get("/{approval_id}", response_model=ApprovalResponse)
async def get_approval(approval_id: str, db: AsyncSession = Depends(get_db)):
    """Get details for a specific approval request."""
    manager = ApprovalManager(db)
    approval = await manager.get_approval(approval_id)
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")
    return approval


@router.post("/{approval_id}/decision", response_model=ApprovalResponse)
async def decide_approval(
    approval_id: str,
    decision: ApprovalDecision,
    db: AsyncSession = Depends(get_db),
):
    """
    Approve or reject a pending mutating action.

    Strict security enforcement: verifies action_hash matches stored action signature,
    checks expiration TTL, prevents replay attacks, and logs audit events.
    """
    manager = ApprovalManager(db)
    audit_service = AuditService(db)

    approval = await manager.get_approval(approval_id)
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")

    decision_mapped = "APPROVED" if decision.decision == "APPROVE" else "REJECTED"

    try:
        resolved = await manager.resolve_approval(
            approval_id=approval_id,
            decision=decision_mapped,
            user_id=decision.user_id,
            reviewer_notes=decision.reviewer_notes,
            provided_hash=decision.action_hash,
        )
    except ApprovalExpiredException as e:
        await audit_service.log_approval_decision(
            approval_id=approval.id,
            conversation_id=approval.conversation_id,
            decision="EXPIRED",
            user_id=decision.user_id,
            action_hash=decision.action_hash,
            tool_name=approval.tool_name,
            reviewer_notes="Request rejected: TTL expired.",
        )
        raise HTTPException(status_code=400, detail=str(e)) from e
    except ApprovalTamperedException as e:
        await audit_service.log_approval_decision(
            approval_id=approval.id,
            conversation_id=approval.conversation_id,
            decision="SECURITY_VIOLATION",
            user_id=decision.user_id,
            action_hash=decision.action_hash,
            tool_name=approval.tool_name,
            reviewer_notes="Security violation: payload tampered or hash mismatch.",
        )
        raise HTTPException(status_code=403, detail=str(e)) from e
    except DuplicateActionException as e:
        raise HTTPException(status_code=409, detail=str(e)) from e
    except UnauthorizedApprovalException as e:
        raise HTTPException(status_code=403, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    # Audit log the decision
    await audit_service.log_approval_decision(
        approval_id=resolved.id,
        conversation_id=resolved.conversation_id,
        decision=resolved.status,
        user_id=decision.user_id,
        action_hash=resolved.action_hash,
        tool_name=resolved.tool_name,
        reviewer_notes=decision.reviewer_notes,
    )

    # If approved, resume graph execution
    if decision_mapped == "APPROVED":
        resume_state = {
            "conversation_id": resolved.conversation_id,
            "messages": [],
            "active_repo": None,
            "intent": "approved_mutation",
            "plan": [f"Execute approved action: {resolved.tool_name}"],
            "current_step": 1,
            "tool_to_execute": {"name": resolved.tool_name, "arguments": resolved.payload},
            "pending_approval": None,
            "approval_status": "APPROVED",
            "tool_result": None,
            "final_response": None,
            "error": None,
        }
        final_state = await workflow.graph.ainvoke(resume_state)
        assistant_text = (
            final_state.get("final_response") or f"Executed and verified {resolved.tool_name}."
        )

        assistant_msg = ConversationMessage(
            conversation_id=resolved.conversation_id,
            role="assistant",
            content=assistant_text,
        )
        db.add(assistant_msg)

        # Mark as executed with nonce (one-time execution guarantee)
        await manager.mark_executed(resolved.id, resolved.execution_nonce)

    await db.commit()
    await db.refresh(resolved)
    return resolved
