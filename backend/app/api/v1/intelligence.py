"""Repository Intelligence REST API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.intelligence import (
    ArchitectureSummary,
    BranchComparison,
    FileBrowseItem,
    FileContentWithLines,
    RepoContextResponse,
    SearchResultItem,
)
from app.services.repo_intelligence import RepoIntelligenceService

router = APIRouter(prefix="/intelligence", tags=["Repository Intelligence"])
service = RepoIntelligenceService()


@router.get("/{owner}/{repo}/context", response_model=RepoContextResponse)
async def get_repository_context(
    owner: str,
    repo: str,
    force_refresh: bool = Query(False, description="Force incremental refresh"),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve or incrementally refresh repository context snapshot based on commit SHA."""
    try:
        return await service.get_or_refresh_context(owner, repo, db, force_refresh)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze repository: {str(e)}") from e


@router.get("/{owner}/{repo}/files", response_model=list[FileBrowseItem])
async def browse_files(
    owner: str,
    repo: str,
    path: str = Query("", description="Relative directory path"),
):
    """Browse repository directory structure."""
    return service.browse_files(owner, repo, path)


@router.get("/{owner}/{repo}/file", response_model=FileContentWithLines)
async def get_file_content(
    owner: str,
    repo: str,
    path: str = Query(..., description="Relative file path"),
    start_line: int | None = Query(None, ge=1, description="Start line number"),
    end_line: int | None = Query(None, ge=1, description="End line number"),
):
    """Retrieve file content formatted with line numbers and citations."""
    try:
        return service.get_file_content_with_lines(owner, repo, path, start_line, end_line)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/{owner}/{repo}/search", response_model=list[SearchResultItem])
async def search_repository_code(
    owner: str,
    repo: str,
    query: str = Query(..., min_length=1, description="Search term or symbol"),
    limit: int = Query(50, ge=1, le=200),
):
    """Search repository code returning matching lines and citations."""
    try:
        return service.search_code(owner, repo, query, limit)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/{owner}/{repo}/compare", response_model=BranchComparison)
async def compare_branches(
    owner: str,
    repo: str,
    base: str = Query("main", description="Base branch"),
    head: str | None = Query(None, description="Head branch (defaults to active branch)"),
):
    """Compare commits and file diff stats between two branches."""
    try:
        return service.compare_branches(owner, repo, base, head)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/{owner}/{repo}/summary", response_model=ArchitectureSummary)
async def get_architecture_summary(
    owner: str,
    repo: str,
):
    """Generate structured architectural assessment with verified facts, reasonable inferences, and unknown information."""
    try:
        return service.generate_architecture_summary(owner, repo)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
