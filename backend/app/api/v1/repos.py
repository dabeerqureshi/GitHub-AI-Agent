"""Repository management API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.repository import RepositoryRecord
from app.schemas.repo import RepositoryResponse, RepositorySyncRequest

router = APIRouter(prefix="/repos", tags=["Repositories"])


@router.get("", response_model=list[RepositoryResponse])
async def list_repositories(db: AsyncSession = Depends(get_db)):
    """List all tracked repositories in the workspace."""
    # Check if there are repositories
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
    return records


@router.post("/sync", response_model=RepositoryResponse)
async def sync_repository(payload: RepositorySyncRequest, db: AsyncSession = Depends(get_db)):
    """Register or sync a repository in the workspace database, fetching metadata from GitHub if token is set."""
    from app.core.config import get_settings
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

    if not repo:
        repo = RepositoryRecord(
            full_name=payload.full_name,
            owner=owner,
            name=name,
            description=description,
            default_branch=default_branch,
            is_private=is_private,
            is_cloned=False,
        )
        db.add(repo)
    else:
        if description:
            repo.description = description
        repo.default_branch = default_branch
        repo.is_private = is_private
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
    from app.core.config import get_settings
    import httpx

    settings = get_settings()
    token = settings.GITHUB_PERSONAL_ACCESS_TOKEN

    # Remove any dummy repo
    await db.execute(
        delete(RepositoryRecord).where(RepositoryRecord.full_name == "octocat/Hello-World")
    )
    await db.commit()

    if token:
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "GitHub-AI-Workspace",
        }
        raw_repos = []
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(
                    "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
                    headers=headers,
                )
                if res.status_code == 200:
                    raw_repos.extend(res.json())
                else:
                    res_alt = await client.get(
                        "https://api.github.com/user/repos?per_page=100&sort=updated",
                        headers=headers,
                    )
                    if res_alt.status_code == 200:
                        raw_repos.extend(res_alt.json())

                for r in raw_repos:
                    if not isinstance(r, dict):
                        continue
                    full_name = r.get("full_name")
                    if not full_name or full_name == "octocat/Hello-World":
                        continue
                    owner = r.get("owner", {}).get("login", full_name.split("/")[0])
                    name = r.get("name", full_name.split("/")[-1])
                    default_branch = r.get("default_branch", "main")
                    is_private = bool(r.get("private", False))
                    description = r.get("description")

                    existing = await db.execute(
                        select(RepositoryRecord).where(RepositoryRecord.full_name == full_name)
                    )
                    repo = existing.scalar_one_or_none()
                    if not repo:
                        repo = RepositoryRecord(
                            full_name=full_name,
                            owner=owner,
                            name=name,
                            description=description,
                            default_branch=default_branch,
                            is_private=is_private,
                            is_cloned=False,
                        )
                        db.add(repo)
                    else:
                        repo.description = description
                        repo.default_branch = default_branch
                        repo.is_private = is_private
                await db.commit()
        except Exception:
            pass

    result = await db.execute(
        select(RepositoryRecord).order_by(RepositoryRecord.last_synced_at.desc())
    )
    return result.scalars().all()


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
