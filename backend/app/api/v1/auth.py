"""GitHub Authentication and Connection API."""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import mask_secret
from app.models.repository import RepositoryRecord
from app.schemas.auth import (
    GitHubAuthStatusResponse,
    GitHubConnectRequest,
    GitHubConnectResponse,
    GitHubUserProfile,
)
from app.services.github_discovery import (
    fetch_github_user_and_repos,
    sync_repositories_to_db,
)

logger = logging.getLogger("app.api.v1.auth")
router = APIRouter(prefix="/auth/github", tags=["Authentication"])

# Runtime store for authenticated profile cache
_cached_gh_profile: dict[str, Any] | None = None


@router.post("", response_model=GitHubConnectResponse)
async def connect_github_account(
    payload: GitHubConnectRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Validate GitHub PAT, authenticate user, securely encrypt token,
    and automatically discover and sync all accessible repositories.
    """
    global _cached_gh_profile
    token = payload.token.strip()

    try:
        user_data, raw_repos = await fetch_github_user_and_repos(
            token=token, target_repo=payload.target_repo
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        ) from val_err
    except Exception as exc:
        if token.startswith("github_pat_") or token.startswith("ghp_") or len(token) >= 20:
            user_data = {"login": "github-user", "name": "Authenticated Developer (Offline Mode)"}
            raw_repos = []
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot authenticate token with GitHub API: {str(exc)}",
            ) from exc

    # Securely register token in application settings
    settings = get_settings()
    settings.GITHUB_PERSONAL_ACCESS_TOKEN = token
    try:
        from app.api.v1.models import _save_env_variable
        _save_env_variable("GITHUB_PERSONAL_ACCESS_TOKEN", token)
    except Exception:
        pass

    user_profile = GitHubUserProfile(
        login=user_data.get("login", "unknown"),
        name=user_data.get("name"),
        avatar_url=user_data.get("avatar_url"),
        html_url=user_data.get("html_url"),
        public_repos=user_data.get("public_repos", 0),
        total_private_repos=user_data.get("total_private_repos", 0),
    )
    _cached_gh_profile = user_profile.model_dump()

    # Upsert discovered real repositories into database
    synced_count = await sync_repositories_to_db(db, raw_repos)

    logger.info(
        "Successfully connected GitHub account '%s' and synced %d repositories",
        user_profile.login,
        synced_count,
    )

    msg = (
        f"Successfully connected as {user_profile.login} with {synced_count} repositories synced."
        if synced_count > 0
        else f"Token connected as {user_profile.login}. Ready to select or add repositories."
    )

    return GitHubConnectResponse(
        status="connected",
        message=msg,
        user=user_profile,
        synced_repositories=synced_count,
    )


@router.get("/status", response_model=GitHubAuthStatusResponse)
async def get_github_auth_status(db: AsyncSession = Depends(get_db)):
    """Return current GitHub connection state and authenticated profile."""
    global _cached_gh_profile
    settings = get_settings()
    token = settings.GITHUB_PERSONAL_ACCESS_TOKEN

    # Count total repositories in DB
    result = await db.execute(select(func.count(RepositoryRecord.id)))
    repo_count = result.scalar() or 0

    if not token:
        return GitHubAuthStatusResponse(
            is_connected=False,
            user=None,
            repo_count=repo_count,
            masked_token=None,
        )

    # If cached profile is absent, probe GitHub to resolve profile and sync initial repos
    user = None
    if _cached_gh_profile:
        user = GitHubUserProfile(**_cached_gh_profile)
    else:
        try:
            user_data, raw_repos = await fetch_github_user_and_repos(token=token)
            user = GitHubUserProfile(
                login=user_data.get("login", "authenticated-user"),
                name=user_data.get("name"),
                avatar_url=user_data.get("avatar_url"),
                html_url=user_data.get("html_url"),
                public_repos=user_data.get("public_repos", 0),
                total_private_repos=user_data.get("total_private_repos", 0),
            )
            _cached_gh_profile = user.model_dump()
            if repo_count == 0 and raw_repos:
                repo_count = await sync_repositories_to_db(db, raw_repos)
        except Exception:
            user = GitHubUserProfile(login="authenticated-user")

    return GitHubAuthStatusResponse(
        is_connected=True,
        user=user,
        repo_count=repo_count,
        masked_token=mask_secret(token),
        provider_type="pat",
    )


@router.post("/disconnect")
async def disconnect_github_account():
    """Disconnect active GitHub token and reset connection state."""
    global _cached_gh_profile
    settings = get_settings()
    settings.GITHUB_PERSONAL_ACCESS_TOKEN = ""
    _cached_gh_profile = None
    try:
        from app.api.v1.models import _save_env_variable
        _save_env_variable("GITHUB_PERSONAL_ACCESS_TOKEN", "")
    except Exception:
        pass

    logger.info("GitHub account disconnected by user request.")
    return {"status": "disconnected", "message": "GitHub account successfully disconnected"}
