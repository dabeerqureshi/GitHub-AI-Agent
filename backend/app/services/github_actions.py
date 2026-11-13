"""GitHub Actions Management Agent Service."""

from typing import Any

from app.agent.tools.mcp_github import GitHubMCPClient
from app.services.github_issues import validate_repo_reference


class GitHubActionsService:
    """Service providing GitHub Actions workflow monitoring and diagnostics backed by MCP."""

    def __init__(self, mcp_client: GitHubMCPClient | None = None):
        self.mcp_client = mcp_client or GitHubMCPClient()

    async def list_workflows(self, repo_ref: str) -> dict[str, Any]:
        """List GitHub Actions workflows in repository."""
        owner, repo = validate_repo_reference(repo_ref)
        return await self.mcp_client.execute_tool(
            "list_workflows",
            {"owner": owner, "repo": repo},
        )

    async def list_workflow_runs(
        self,
        repo_ref: str,
        workflow_id: str | int | None = None,
        status: str | None = None,
        page: int = 1,
        per_page: int = 30,
    ) -> dict[str, Any]:
        """List workflow runs with status filtering and pagination."""
        owner, repo = validate_repo_reference(repo_ref)
        args: dict[str, Any] = {
            "owner": owner,
            "repo": repo,
            "page": max(1, page),
            "per_page": min(100, max(1, per_page)),
        }
        if workflow_id:
            args["workflow_id"] = str(workflow_id)
        if status:
            args["status"] = status
        return await self.mcp_client.execute_tool("list_workflow_runs", args)

    async def get_job_status(self, repo_ref: str, run_id: int) -> dict[str, Any]:
        """Inspect status of jobs and steps for a workflow run."""
        owner, repo = validate_repo_reference(repo_ref)
        if run_id <= 0:
            raise ValueError(f"Invalid workflow run ID: {run_id}")
        return await self.mcp_client.execute_tool(
            "list_workflow_jobs",
            {"owner": owner, "repo": repo, "run_id": run_id},
        )

    async def get_logs(self, repo_ref: str, run_id: int) -> dict[str, Any]:
        """Retrieve workflow execution logs."""
        owner, repo = validate_repo_reference(repo_ref)
        if run_id <= 0:
            raise ValueError(f"Invalid workflow run ID: {run_id}")
        return await self.mcp_client.execute_tool(
            "get_workflow_run_logs",
            {"owner": owner, "repo": repo, "run_id": run_id},
        )

    async def identify_failing_steps(self, repo_ref: str, run_id: int) -> dict[str, Any]:
        """Identify which step failed within a run."""
        owner, repo = validate_repo_reference(repo_ref)
        if run_id <= 0:
            raise ValueError(f"Invalid workflow run ID: {run_id}")
        return await self.mcp_client.execute_tool(
            "analyze_failing_workflow_steps",
            {"owner": owner, "repo": repo, "run_id": run_id},
        )

    async def diagnose_and_recommend(self, repo_ref: str, run_id: int) -> dict[str, Any]:
        """Extract failing steps, summarize errors, and recommend fixes."""
        owner, repo = validate_repo_reference(repo_ref)
        if run_id <= 0:
            raise ValueError(f"Invalid workflow run ID: {run_id}")

        analysis = await self.identify_failing_steps(repo_ref, run_id)
        logs = await self.get_logs(repo_ref, run_id)

        content = analysis.get("content", [])
        log_content = logs.get("content", [])

        summary = (
            f"### Automated Failure Diagnosis for Run #{run_id} in {owner}/{repo}\n\n"
            + "\n".join(str(c) for c in content)
            + "\n\n**Log Snippet:**\n```\n"
            + "\n".join(str(item) for item in log_content)
            + "\n```"
        )

        return {
            "tool": "diagnose_workflow_failure",
            "content": [summary],
            "analysis": analysis,
            "logs": logs,
            "is_error": False,
        }

    async def rerun_workflow(self, repo_ref: str, run_id: int) -> dict[str, Any]:
        """Trigger re-run of a workflow run (mutating)."""
        owner, repo = validate_repo_reference(repo_ref)
        if run_id <= 0:
            raise ValueError(f"Invalid workflow run ID: {run_id}")
        return await self.mcp_client.execute_tool(
            "rerun_workflow",
            {"owner": owner, "repo": repo, "run_id": run_id},
        )
