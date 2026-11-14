"""Repository management API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.repository import RepositoryRecord
from app.schemas.repo import RepositoryResponse, RepositorySyncRequest
from app.services.github_discovery import (
    detect_local_git_repo,
    fetch_github_user_and_repos,
    sync_repositories_to_db,
)

router = APIRouter(prefix="/repos", tags=["Repositories"])


@router.get("", response_model=list[RepositoryResponse])
async def list_repositories(db: AsyncSession = Depends(get_db)):
    """List all tracked repositories in the workspace, auto-syncing if empty and token is present."""
    result = await db.execute(
        select(RepositoryRecord).order_by(RepositoryRecord.last_synced_at.desc())
    )
    records = result.scalars().all()

    # If other repositories exist alongside dummy, remove dummy
    if any(r.full_name != "octocat/Hello-World" for r in records):
        await db.execute(
            delete(RepositoryRecord).where(RepositoryRecord.full_name == "octocat/Hello-World")
        )
        await db.commit()
        result = await db.execute(
            select(RepositoryRecord).order_by(RepositoryRecord.last_synced_at.desc())
        )
        records = result.scalars().all()

    # If completely empty and GITHUB_PERSONAL_ACCESS_TOKEN is configured, auto-sync
    settings = get_settings()
    if not records and settings.GITHUB_PERSONAL_ACCESS_TOKEN:
        return await refresh_repositories(db=db)

    return records


@router.post("/sync", response_model=RepositoryResponse)
async def sync_repository(payload: RepositorySyncRequest, db: AsyncSession = Depends(get_db)):
    """Register or sync a repository in the workspace database, fetching metadata from GitHub if token is set."""
    import httpx

    parts = payload.full_name.strip().split("/")
    if len(parts) != 2 or not parts[0] or not parts[1]:
        raise HTTPException(
            status_code=400,
            detail="Repository full_name must be in 'owner/repo' format",
        )

    owner, name = parts[0], parts[1]
    default_branch = "main"
    is_private = False
    description = None

    # Fetch real live repo info from GitHub if token exists
    settings = get_settings()
    token = settings.GITHUB_PERSONAL_ACCESS_TOKEN
    if token:
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "GitHub-AI-Workspace",
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(
                    f"https://api.github.com/repos/{owner}/{name}", headers=headers
                )
                if res.status_code == 200:
                    data = res.json()
                    default_branch = data.get("default_branch", "main")
                    is_private = bool(data.get("private", False))
                    description = data.get("description")
        except Exception:
            pass

    result = await db.execute(
        select(RepositoryRecord).where(RepositoryRecord.full_name == payload.full_name)
    )
    repo = result.scalar_one_or_none()

    local_repo = detect_local_git_repo()
    is_cloned = bool(local_repo and local_repo.lower() == payload.full_name.lower())

    if not repo:
        repo = RepositoryRecord(
            full_name=payload.full_name,
            owner=owner,
            name=name,
            description=description,
            default_branch=default_branch,
            is_private=is_private,
            is_cloned=is_cloned,
        )
        db.add(repo)
    else:
        if description:
            repo.description = description
        repo.default_branch = default_branch
        repo.is_private = is_private
        if is_cloned:
            repo.is_cloned = True
        repo.last_synced_at = repo.created_at

    # Remove any dummy octocat/Hello-World
    await db.execute(
        delete(RepositoryRecord).where(RepositoryRecord.full_name == "octocat/Hello-World")
    )

    await db.commit()
    await db.refresh(repo)
    return repo


@router.post("/refresh", response_model=list[RepositoryResponse])
async def refresh_repositories(db: AsyncSession = Depends(get_db)):
    """Fetch updated repositories from GitHub if authenticated and return all tracked repositories."""
    settings = get_settings()
    token = settings.GITHUB_PERSONAL_ACCESS_TOKEN

    if token:
        try:
            _user_data, raw_repos = await fetch_github_user_and_repos(token=token)
            await sync_repositories_to_db(db, raw_repos)
        except Exception:
            pass

    result = await db.execute(
        select(RepositoryRecord).order_by(RepositoryRecord.last_synced_at.desc())
    )
    records = result.scalars().all()
    # Remove dummy if other repos exist
    if any(r.full_name != "octocat/Hello-World" for r in records):
        await db.execute(
            delete(RepositoryRecord).where(RepositoryRecord.full_name == "octocat/Hello-World")
        )
        await db.commit()
        result = await db.execute(
            select(RepositoryRecord).order_by(RepositoryRecord.last_synced_at.desc())
        )
        records = result.scalars().all()
    return records


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
