"""Human-in-the-Loop approvals API endpoints."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.graph import GitHubAgentWorkflow
from app.core.database import get_db
from app.core.security import verify_action_hash
from app.models.approval import ApprovalRequest, ApprovalStatus
from app.models.audit import AuditEvent
from app.models.conversation import ConversationMessage
from app.schemas.approval import ApprovalDecision, ApprovalResponse

router = APIRouter(prefix="/approvals", tags=["Approvals"])
workflow = GitHubAgentWorkflow()


@router.get("/pending", response_model=list[ApprovalResponse])
async def list_pending_approvals(db: AsyncSession = Depends(get_db)):
    """List all pending approval requests requiring human confirmation."""
    result = await db.execute(
        select(ApprovalRequest)
        .where(ApprovalRequest.status == ApprovalStatus.PENDING.value)
        .order_by(ApprovalRequest.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{approval_id}", response_model=ApprovalResponse)
async def get_approval(approval_id: str, db: AsyncSession = Depends(get_db)):
    """Get details for a specific approval request."""
    result = await db.execute(select(ApprovalRequest).where(ApprovalRequest.id == approval_id))
    approval = result.scalar_one_or_none()
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

    Strict security enforcement: verifies action_hash matches stored action signature.
    """
    result = await db.execute(select(ApprovalRequest).where(ApprovalRequest.id == approval_id))
    approval = result.scalar_one_or_none()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval request not found")

    if approval.status != ApprovalStatus.PENDING.value:
        raise HTTPException(
            status_code=400,
            detail=f"Approval request already resolved with status '{approval.status}'",
        )

    # Cryptographic binding check: verify action signature
    if approval.action_hash != decision.action_hash:
        raise HTTPException(
            status_code=403,
            detail="Action hash mismatch. The approved action parameters do not match stored payload.",
        )

    # Double-check computed hash against payload
    is_valid = verify_action_hash(
        provided_hash=decision.action_hash,
        tool_name=approval.tool_name,
        payload=approval.payload,
        context_id=approval.step_id,
    )
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail="Payload verification failed. Tampering detected.",
        )

    # Update approval state
    approval.status = (
        ApprovalStatus.APPROVED.value
        if decision.decision == "APPROVE"
        else ApprovalStatus.REJECTED.value
    )
    approval.reviewer_notes = decision.reviewer_notes
    approval.resolved_at = datetime.now(UTC)

    # Append decision to audit log
    audit = AuditEvent(
        event_type="APPROVAL_DECISION",
        conversation_id=approval.conversation_id,
        action_hash=approval.action_hash,
        tool_name=approval.tool_name,
        status=approval.status,
        details={
            "approval_id": approval.id,
            "decision": decision.decision,
            "reviewer_notes": decision.reviewer_notes,
            "payload": approval.payload,
        },
    )
    db.add(audit)

    # If approved, resume graph execution
    if decision.decision == "APPROVE":
        resume_state = {
            "conversation_id": approval.conversation_id,
            "messages": [],
            "active_repo": None,
            "intent": "approved_mutation",
            "plan": [f"Execute approved action: {approval.tool_name}"],
            "current_step": 1,
            "tool_to_execute": {"name": approval.tool_name, "arguments": approval.payload},
            "pending_approval": None,
            "approval_status": "APPROVED",
            "tool_result": None,
            "final_response": None,
            "error": None,
        }
        final_state = await workflow.graph.ainvoke(resume_state)
        assistant_text = (
            final_state.get("final_response") or f"Executed and verified {approval.tool_name}."
        )

        assistant_msg = ConversationMessage(
            conversation_id=approval.conversation_id,
            role="assistant",
            content=assistant_text,
        )
        db.add(assistant_msg)

    await db.commit()
    await db.refresh(approval)
    return approval
