"""Pydantic schemas for repository management."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RepositoryResponse(BaseModel):
    """Schema for repository details."""

    id: str
    full_name: str
    name: str
    owner: str
    description: str | None = None
    default_branch: str
    is_private: bool
    is_cloned: bool
    local_path: str | None = None
    last_synced_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RepositorySyncRequest(BaseModel):
    """Schema for requesting repository sync or clone."""

    full_name: str = Field(..., description="Target repository, e.g. octocat/Hello-World")
