"""Repository management API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.repository import RepositoryRecord
from app.schemas.repo import RepositoryResponse, RepositorySyncRequest

router = APIRouter(prefix="/repos", tags=["Repositories"])


@router.get("", response_model=list[RepositoryResponse])
async def list_repositories(db: AsyncSession = Depends(get_db)):
    """List all tracked repositories in the workspace."""
    result = await db.execute(
        select(RepositoryRecord).order_by(RepositoryRecord.last_synced_at.desc())
    )
    return result.scalars().all()


@router.post("/sync", response_model=RepositoryResponse)
async def sync_repository(payload: RepositorySyncRequest, db: AsyncSession = Depends(get_db)):
    """Register or sync a repository in the workspace database."""
    parts = payload.full_name.strip().split("/")
    if len(parts) != 2 or not parts[0] or not parts[1]:
        raise HTTPException(
            status_code=400,
            detail="Repository full_name must be in 'owner/repo' format",
        )

    owner, name = parts[0], parts[1]
    result = await db.execute(
        select(RepositoryRecord).where(RepositoryRecord.full_name == payload.full_name)
    )
    repo = result.scalar_one_or_none()

    if not repo:
        repo = RepositoryRecord(
            full_name=payload.full_name,
            owner=owner,
            name=name,
            default_branch="main",
            is_private=False,
            is_cloned=False,
        )
        db.add(repo)
    else:
        repo.last_synced_at = repo.created_at  # updates timestamp

    await db.commit()
    await db.refresh(repo)
    return repo


@router.get("/{owner}/{repo}", response_model=RepositoryResponse)
async def get_repository(owner: str, repo: str, db: AsyncSession = Depends(get_db)):
    """Get details for a specific repository."""
    full_name = f"{owner}/{repo}"
    result = await db.execute(
        select(RepositoryRecord).where(RepositoryRecord.full_name == full_name)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail=f"Repository '{full_name}' not found")
    return record
