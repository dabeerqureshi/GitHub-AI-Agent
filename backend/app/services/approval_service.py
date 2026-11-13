"""Centralized Approval Manager with Cryptographic Validation, TTL Expiration, and Replay Protection."""

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import generate_action_hash, verify_action_hash
from app.models.approval import ApprovalRequest, ApprovalStatus
from app.models.base import generate_uuid, utc_now


class ApprovalSecurityException(Exception):
    """Base exception for approval security violations."""

    pass


class ApprovalExpiredException(ApprovalSecurityException):
    """Raised when an approval request has exceeded its TTL expiration."""

    pass


class ApprovalTamperedException(ApprovalSecurityException):
    """Raised when approval parameters do not match the cryptographic action hash."""

    pass


class DuplicateActionException(ApprovalSecurityException):
    """Raised when an action is executed more than once with the same nonce."""

    pass


class UnauthorizedApprovalException(ApprovalSecurityException):
    """Raised when an unauthorized user attempts to resolve an approval."""

    pass


def _ensure_utc(dt: datetime | None) -> datetime | None:
    """Ensure datetime is offset-aware in UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt


class ApprovalManager:
    """Centralized service for managing human-in-the-loop approvals with strict security invariants."""

    def __init__(self, db: AsyncSession, default_ttl_minutes: int = 30):
        self.db = db
        self.default_ttl = timedelta(minutes=default_ttl_minutes)

    async def create_approval_request(
        self,
        conversation_id: str,
        tool_name: str,
        step_id: str,
        description: str,
        payload: dict[str, Any],
        repo_name: str | None = None,
        user_id: str = "local-user",
        ttl_minutes: int | None = None,
    ) -> ApprovalRequest:
        """Create a new tamper-evident approval request with cryptographic hash and TTL expiration."""
        ttl = timedelta(minutes=ttl_minutes) if ttl_minutes else self.default_ttl
        now = utc_now()
        expires_at = now + ttl

        action_hash = generate_action_hash(tool_name, payload, context_id=step_id)
        execution_nonce = generate_uuid()

        approval = ApprovalRequest(
            conversation_id=conversation_id,
            user_id=user_id,
            repo_name=repo_name,
            step_id=step_id,
            tool_name=tool_name,
            action_hash=action_hash,
            description=description,
            payload=payload,
            status=ApprovalStatus.PENDING.value,
            execution_nonce=execution_nonce,
            expires_at=expires_at,
            is_executed=False,
        )

        self.db.add(approval)
        await self.db.commit()
        await self.db.refresh(approval)
        return approval

    async def get_approval(self, approval_id: str) -> ApprovalRequest | None:
        """Retrieve approval request by ID."""
        result = await self.db.execute(
            select(ApprovalRequest).where(ApprovalRequest.id == approval_id)
        )
        return result.scalar_one_or_none()

    async def list_approvals(
        self,
        conversation_id: str | None = None,
        status: str | None = None,
        user_id: str | None = None,
        limit: int = 50,
    ) -> list[ApprovalRequest]:
        """List approval requests with optional status and conversation filters."""
        query = select(ApprovalRequest).order_by(ApprovalRequest.created_at.desc()).limit(limit)

        if conversation_id:
            query = query.where(ApprovalRequest.conversation_id == conversation_id)
        if status:
            query = query.where(ApprovalRequest.status == status)
        if user_id:
            query = query.where(ApprovalRequest.user_id == user_id)

        result = await self.db.execute(query)
        approvals = list(result.scalars().all())

        # Auto-expire any pending approvals that have exceeded their TTL
        now = datetime.now(UTC)
        updated = False
        for app in approvals:
            exp = _ensure_utc(app.expires_at)
            if app.status == ApprovalStatus.PENDING.value and exp and exp < now:
                app.status = ApprovalStatus.EXPIRED.value
                updated = True
        if updated:
            await self.db.commit()

        return approvals

    async def resolve_approval(
        self,
        approval_id: str,
        decision: str,  # "APPROVED" or "REJECTED"
        user_id: str = "local-user",
        reviewer_notes: str | None = None,
        provided_hash: str | None = None,
    ) -> ApprovalRequest:
        """Validate, authenticate, and resolve an approval request."""
        approval = await self.get_approval(approval_id)
        if not approval:
            raise ValueError(f"Approval request '{approval_id}' not found.")

        # 1. Authorization check
        if approval.user_id and approval.user_id != user_id:
            raise UnauthorizedApprovalException(
                f"User '{user_id}' is not authorized to resolve this approval."
            )

        # 2. Check current status
        if approval.status != ApprovalStatus.PENDING.value:
            raise ValueError(f"Approval is already resolved with status: {approval.status}")

        # 3. Check expiration
        now = datetime.now(UTC)
        exp = _ensure_utc(approval.expires_at)
        if exp and exp < now:
            approval.status = ApprovalStatus.EXPIRED.value
            approval.resolved_at = now
            await self.db.commit()
            raise ApprovalExpiredException("Approval request has expired.")

        # 4. Action hash verification
        if provided_hash and provided_hash != approval.action_hash:
            raise ApprovalTamperedException(
                "Provided action signature hash does not match stored action hash."
            )

        # Cryptographic integrity check against payload (tamper resistance)
        if not verify_action_hash(
            provided_hash=approval.action_hash,
            tool_name=approval.tool_name,
            payload=approval.payload,
            context_id=approval.step_id,
        ):
            approval.status = ApprovalStatus.REJECTED.value
            approval.reviewer_notes = "Security violation: action payload hash mismatch."
            approval.resolved_at = now
            await self.db.commit()
            raise ApprovalTamperedException(
                "Cryptographic action hash mismatch. Payload has been tampered with."
            )

        # 5. Check if already executed (replay protection)
        if approval.is_executed:
            raise DuplicateActionException("Action has already been executed.")

        # 6. Apply resolution
        decision_upper = decision.upper()
        if decision_upper not in (ApprovalStatus.APPROVED.value, ApprovalStatus.REJECTED.value):
            raise ValueError(f"Invalid approval decision: {decision}")

        approval.status = decision_upper
        approval.reviewer_notes = reviewer_notes
        approval.resolved_at = now

        await self.db.commit()
        await self.db.refresh(approval)
        return approval

    async def mark_executed(self, approval_id: str, execution_nonce: str) -> ApprovalRequest:
        """Mark an approved request as executed once with its execution nonce."""
        approval = await self.get_approval(approval_id)
        if not approval:
            raise ValueError(f"Approval request '{approval_id}' not found.")

        if approval.is_executed:
            raise DuplicateActionException("Action has already been executed.")

        if approval.status != ApprovalStatus.APPROVED.value:
            raise ValueError(f"Cannot execute approval with status: {approval.status}")

        if approval.execution_nonce != execution_nonce:
            raise DuplicateActionException("Invalid execution nonce for approval.")

        approval.is_executed = True
        approval.executed_at = datetime.now(UTC)

        await self.db.commit()
        await self.db.refresh(approval)
        return approval
