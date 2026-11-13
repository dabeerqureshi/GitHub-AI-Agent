"""GitHub Issue Management Agent Service."""

import re
from typing import Any

from app.agent.tools.mcp_github import GitHubMCPClient

REPO_REGEX = re.compile(r"^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$")


def validate_repo_reference(full_name: str) -> tuple[str, str]:
    """Validate repository name in 'owner/repo' format."""
    clean = full_name.strip()
    if not REPO_REGEX.match(clean):
        raise ValueError(
            f"Invalid repository reference '{full_name}'. Expected format: 'owner/repo'."
        )
    owner, repo = clean.split("/", 1)
    return owner, repo


class GitHubIssueService:
    """Service providing issue management operations backed by MCP."""

    def __init__(self, mcp_client: GitHubMCPClient | None = None):
        self.mcp_client = mcp_client or GitHubMCPClient()

    async def search_issues(
        self,
        repo_ref: str,
        query: str = "",
        state: str = "open",
        page: int = 1,
        per_page: int = 30,
    ) -> dict[str, Any]:
        """Search issues by keywords and state with pagination."""
        owner, repo = validate_repo_reference(repo_ref)
        p = max(1, page)
        pp = min(100, max(1, per_page))
        return await self.mcp_client.execute_tool(
            "search_issues",
            {
                "owner": owner,
                "repo": repo,
                "query": query,
                "state": state,
                "page": p,
                "per_page": pp,
            },
        )

    async def list_assigned_issues(
        self,
        repo_ref: str,
        assignee: str,
        state: str = "open",
        page: int = 1,
        per_page: int = 30,
    ) -> dict[str, Any]:
        """List issues assigned to a specific user with pagination."""
        owner, repo = validate_repo_reference(repo_ref)
        p = max(1, page)
        pp = min(100, max(1, per_page))
        return await self.mcp_client.execute_tool(
            "list_issues",
            {
                "owner": owner,
                "repo": repo,
                "assignee": assignee,
                "state": state,
                "page": p,
                "per_page": pp,
            },
        )

    async def create_issue(
        self,
        repo_ref: str,
        title: str,
        body: str = "",
        labels: list[str] | None = None,
        assignees: list[str] | None = None,
    ) -> dict[str, Any]:
        """Create a new issue (mutating)."""
        owner, repo = validate_repo_reference(repo_ref)
        if not title.strip():
            raise ValueError("Issue title cannot be empty.")
        return await self.mcp_client.execute_tool(
            "create_issue",
            {
                "owner": owner,
                "repo": repo,
                "title": title.strip(),
                "body": body.strip(),
                "labels": labels or [],
                "assignees": assignees or [],
            },
        )

    async def update_issue(
        self,
        repo_ref: str,
        issue_number: int,
        title: str | None = None,
        body: str | None = None,
        state: str | None = None,
    ) -> dict[str, Any]:
        """Update issue title, description, or state (mutating)."""
        owner, repo = validate_repo_reference(repo_ref)
        if issue_number <= 0:
            raise ValueError(f"Invalid issue number: {issue_number}")
        args: dict[str, Any] = {"owner": owner, "repo": repo, "issue_number": issue_number}
        if title:
            args["title"] = title.strip()
        if body is not None:
            args["body"] = body.strip()
        if state:
            args["state"] = state.lower()
        return await self.mcp_client.execute_tool("update_issue", args)

    async def add_labels(
        self, repo_ref: str, issue_number: int, labels: list[str]
    ) -> dict[str, Any]:
        """Add one or more labels to an issue (mutating)."""
        owner, repo = validate_repo_reference(repo_ref)
        if issue_number <= 0:
            raise ValueError(f"Invalid issue number: {issue_number}")
        return await self.mcp_client.execute_tool(
            "add_labels_to_issue",
            {"owner": owner, "repo": repo, "issue_number": issue_number, "labels": labels},
        )

    async def assign_users(
        self, repo_ref: str, issue_number: int, assignees: list[str]
    ) -> dict[str, Any]:
        """Assign users to an issue (mutating)."""
        owner, repo = validate_repo_reference(repo_ref)
        if issue_number <= 0:
            raise ValueError(f"Invalid issue number: {issue_number}")
        return await self.mcp_client.execute_tool(
            "assign_issue",
            {"owner": owner, "repo": repo, "issue_number": issue_number, "assignees": assignees},
        )

    async def add_comment(self, repo_ref: str, issue_number: int, comment: str) -> dict[str, Any]:
        """Add a comment to an issue (mutating)."""
        owner, repo = validate_repo_reference(repo_ref)
        if issue_number <= 0:
            raise ValueError(f"Invalid issue number: {issue_number}")
        if not comment.strip():
            raise ValueError("Comment cannot be empty.")
        return await self.mcp_client.execute_tool(
            "add_issue_comment",
            {
                "owner": owner,
                "repo": repo,
                "issue_number": issue_number,
                "comment": comment.strip(),
            },
        )

    async def close_issue(self, repo_ref: str, issue_number: int) -> dict[str, Any]:
        """Close an issue (mutating)."""
        owner, repo = validate_repo_reference(repo_ref)
        if issue_number <= 0:
            raise ValueError(f"Invalid issue number: {issue_number}")
        return await self.mcp_client.execute_tool(
            "close_issue",
            {"owner": owner, "repo": repo, "issue_number": issue_number},
        )

    async def reopen_issue(self, repo_ref: str, issue_number: int) -> dict[str, Any]:
        """Reopen a closed issue (mutating)."""
        owner, repo = validate_repo_reference(repo_ref)
        if issue_number <= 0:
            raise ValueError(f"Invalid issue number: {issue_number}")
        return await self.mcp_client.execute_tool(
            "reopen_issue",
            {"owner": owner, "repo": repo, "issue_number": issue_number},
        )
