"""Pydantic schemas for Repository Intelligence."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class FileBrowseItem(BaseModel):
    """Represents a file or directory in repository browser."""

    name: str
    path: str
    type: str  # "file" or "directory"
    size: int = 0
    extension: str = ""


class FileContentWithLines(BaseModel):
    """File content formatted with line ranges and citations."""

    path: str
    total_lines: int
    start_line: int
    end_line: int
    content: str
    citation: str = Field(..., description="Citation string, e.g. [src/auth.py#L10-L25]")


class SearchResultItem(BaseModel):
    """Represents a code search hit with file path, line numbers, and snippet."""

    path: str
    line_number: int
    line_content: str
    matched_term: str
    citation: str


class BranchComparison(BaseModel):
    """Branch comparison between base and head."""

    base_branch: str
    head_branch: str
    ahead_by: int
    behind_by: int
    commits: list[dict[str, Any]]
    changed_files: list[str]
    diff_stat: str


class ArchitectureSummary(BaseModel):
    """Structured architectural assessment with fact/inference distinctions."""

    full_name: str
    commit_sha: str | None = None
    primary_languages: list[str]
    frameworks_detected: list[str]
    verified_facts: list[str] = Field(
        ..., description="Directly verified facts from source files and git commits"
    )
    reasonable_inferences: list[str] = Field(
        ..., description="Plausible design inferences based on structure and conventions"
    )
    unknown_information: list[str] = Field(
        ..., description="Explicitly unknown or unverified aspects not found in repository"
    )
    markdown_report: str


class RepoContextResponse(BaseModel):
    """Full repository intelligence snapshot."""

    id: str
    full_name: str
    default_branch: str
    last_indexed_commit_sha: str | None = None
    languages: list[str]
    directory_tree: dict[str, Any]
    documentation_files: list[dict[str, Any]]
    configuration_files: list[dict[str, Any]]
    dependencies: dict[str, Any]
    symbols: dict[str, Any]
    architecture_summary: str | None = None
    last_refreshed_at: datetime

    model_config = ConfigDict(from_attributes=True)
