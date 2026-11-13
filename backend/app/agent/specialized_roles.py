"""Specialized Agent Roles and Workflow Definitions under Single Orchestrator."""

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class SpecializedRole(StrEnum):
    """The 6 specialized agent personas orchestrated within the single LangGraph engine."""

    REPOSITORY_ANALYST = "Repository Analyst"
    ISSUE_MANAGER = "Issue Manager"
    PR_REVIEWER = "Pull Request Reviewer"
    CODING_AGENT = "Coding Agent"
    GIT_OPERATIONS = "Git Operations Agent"
    ACTIONS_ANALYST = "GitHub Actions Analyst"


class PlanStep(BaseModel):
    """Structured plan step with dependency tracking and approval checkpointing."""

    id: str = Field(..., description="Unique step identifier (e.g. step-1)")
    description: str = Field(..., description="Human-readable step goal")
    agent_role: SpecializedRole = Field(..., description="Specialized role owning this step")
    depends_on: list[str] = Field(
        default_factory=list, description="IDs of steps that must complete first"
    )
    status: str = Field(
        "PENDING", description="PENDING, IN_PROGRESS, COMPLETED, FAILED, WAITING_APPROVAL"
    )
    requires_approval: bool = Field(
        False, description="Whether this step pauses for human confirmation"
    )
    tool_name: str | None = Field(None, description="Allowlisted tool to execute")
    parameters: dict[str, Any] = Field(default_factory=dict, description="Validated tool arguments")
    result_summary: str | None = Field(None, description="Summary of step execution outcome")


ROLE_DESCRIPTIONS: dict[SpecializedRole, str] = {
    SpecializedRole.REPOSITORY_ANALYST: "Specializes in repository structure, architectural analysis, symbol dependencies, tech debt identification, and code duplication analysis.",
    SpecializedRole.ISSUE_MANAGER: "Specializes in issue triage, bug report creation, label assignments, release summaries, and issue lifecycle management.",
    SpecializedRole.PR_REVIEWER: "Specializes in pull request code inspection, batch PR reviews, diff analysis, security audits, and review submissions.",
    SpecializedRole.CODING_AGENT: "Specializes in multi-file feature implementation, bug reproduction, isolated worktree modification, and automated test generation.",
    SpecializedRole.GIT_OPERATIONS: "Specializes in local git worktree management, branch comparison, commit regression analysis, diff inspection, and safe pushing.",
    SpecializedRole.ACTIONS_ANALYST: "Specializes in GitHub Actions CI/CD workflows, build failure diagnosis, log analysis, and remediation recommendations.",
}
