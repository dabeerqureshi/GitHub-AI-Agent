"""Schemas for GitHub authentication and token management."""

from pydantic import BaseModel, Field


class GitHubConnectRequest(BaseModel):
    """Payload to connect or update GitHub Personal Access Token."""

    token: str = Field(..., min_length=10, description="GitHub Personal Access Token (PAT)")
    target_repo: str | None = Field(
        default=None,
        description="Optional specific repository to sync immediately, e.g. owner/repo",
    )


class GitHubUserProfile(BaseModel):
    """Public profile of authenticated GitHub user."""

    login: str
    name: str | None = None
    avatar_url: str | None = None
    html_url: str | None = None
    public_repos: int = 0
    total_private_repos: int = 0


class GitHubAuthStatusResponse(BaseModel):
    """Status of GitHub connectivity in the workspace."""

    is_connected: bool
    user: GitHubUserProfile | None = None
    repo_count: int = 0
    masked_token: str | None = None
    provider_type: str = "pat"


class GitHubConnectResponse(BaseModel):
    """Response after connecting GitHub PAT."""

    status: str = "connected"
    message: str
    user: GitHubUserProfile
    synced_repositories: int = 0
