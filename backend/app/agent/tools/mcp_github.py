"""GitHub Model Context Protocol (MCP) client manager and tool wrapper."""

import os
import shutil
from typing import Any

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from app.core.config import get_settings

# Tools that mutate remote state and require Human-in-the-Loop approval
MUTATING_GITHUB_TOOLS = {
    "create_or_update_file",
    "push_files",
    "create_issue",
    "update_issue",
    "add_issue_comment",
    "create_pull_request",
    "update_pull_request",
    "merge_pull_request",
    "create_branch",
    "delete_branch",
}

READ_ONLY_GITHUB_TOOLS = {
    "list_repositories",
    "get_file_contents",
    "get_issue",
    "list_issues",
    "get_pull_request",
    "list_pull_requests",
    "search_code",
    "search_issues",
    "search_repositories",
    "list_workflow_runs",
    "get_workflow_run_logs",
    "get_commit",
    "list_commits",
    "get_authenticated_user",
}


def is_mutating_tool(tool_name: str) -> bool:
    """Return True if tool performs state mutation, False if read-only."""
    return tool_name in MUTATING_GITHUB_TOOLS


class GitHubMCPClient:
    """Client for interacting with the official GitHub Model Context Protocol server."""

    def __init__(
        self,
        github_token: str | None = None,
        command: str | None = None,
        mock_mode: bool = False,
    ):
        settings = get_settings()
        self.github_token = github_token or settings.GITHUB_PERSONAL_ACCESS_TOKEN
        self.command_str = command or settings.GITHUB_MCP_COMMAND
        self.mock_mode = mock_mode or not bool(self.github_token)
        self.session: ClientSession | None = None
        self._client_context = None

    def _get_server_params(self) -> StdioServerParameters:
        """Parse command and build StdioServerParameters."""
        parts = self.command_str.split()
        cmd = parts[0]
        args = parts[1:] if len(parts) > 1 else []

        env = os.environ.copy()
        if self.github_token:
            env["GITHUB_PERSONAL_ACCESS_TOKEN"] = self.github_token

        # Resolve command path if needed
        resolved_cmd = shutil.which(cmd) or cmd
        return StdioServerParameters(command=resolved_cmd, args=args, env=env)

    async def list_available_tools(self) -> list[dict[str, Any]]:
        """List all tools available on the GitHub MCP server."""
        if self.mock_mode:
            return [
                {
                    "name": tool,
                    "description": f"GitHub MCP tool: {tool}",
                    "is_mutating": is_mutating_tool(tool),
                }
                for tool in sorted(MUTATING_GITHUB_TOOLS | READ_ONLY_GITHUB_TOOLS)
            ]

        async with stdio_client(self._get_server_params()) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                tools_result = await session.list_tools()
                return [
                    {
                        "name": tool.name,
                        "description": tool.description,
                        "input_schema": tool.inputSchema,
                        "is_mutating": is_mutating_tool(tool.name),
                    }
                    for tool in tools_result.tools
                ]

    async def execute_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """Execute a tool via MCP stdio or fallback handler."""
        # Security: validate tool belongs to known registry
        if name not in MUTATING_GITHUB_TOOLS and name not in READ_ONLY_GITHUB_TOOLS:
            raise ValueError(f"Tool '{name}' is not in the allowlisted GitHub MCP registry.")

        if self.mock_mode:
            return self._execute_mock(name, arguments)

        async with stdio_client(self._get_server_params()) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                result = await session.call_tool(name, arguments)
                return {
                    "tool": name,
                    "content": [c.text if hasattr(c, "text") else str(c) for c in result.content],
                    "is_error": result.isError,
                }

    def _execute_mock(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """Offline mock response for testing or when token is not configured."""
        if name == "list_repositories":
            return {
                "tool": name,
                "content": [
                    "facebook/react - The library for web and native user interfaces",
                    "octocat/Hello-World - Sample repository",
                ],
                "is_error": False,
                "mock": True,
            }
        elif name == "list_issues":
            repo = f"{arguments.get('owner', 'octocat')}/{arguments.get('repo', 'Hello-World')}"
            return {
                "tool": name,
                "content": [
                    f"Issue #101 [OPEN] in {repo}: Fix memory leak in reconciliation loop",
                    f"Issue #102 [OPEN] in {repo}: Update TypeScript definitions for React 19",
                ],
                "is_error": False,
                "mock": True,
            }
        elif name == "get_pull_request":
            pr_num = arguments.get("pull_number", 42)
            return {
                "tool": name,
                "content": [
                    f"PR #{pr_num} [OPEN]: Add async request deduplication\nAuthor: dabeer\nDiff: +45 -12 lines\nStatus: 2 approvals, CI passing",
                ],
                "is_error": False,
                "mock": True,
            }
        elif name == "list_workflow_runs":
            return {
                "tool": name,
                "content": [
                    "Workflow 'CI / Test': Run #89 - Status: FAILED (Step 'Run Pytest' exited with code 1)",
                    "Workflow 'Lint and Typecheck': Run #88 - Status: SUCCESS",
                ],
                "is_error": False,
                "mock": True,
            }
        elif name == "search_code":
            query = arguments.get("query", "auth")
            return {
                "tool": name,
                "content": [
                    f"Found matches for '{query}':\n- src/auth/provider.ts:42 (class AuthProvider)\n- src/middleware/token.py:15 (verify_jwt_token)",
                ],
                "is_error": False,
                "mock": True,
            }
        elif name in ("get_commit", "list_commits"):
            return {
                "tool": name,
                "content": [
                    "Commit a8f2d1e by Alice <alice@example.com> on main:\nfeat: implement token encryption with Fernet\nDate: 2 hours ago",
                ],
                "is_error": False,
                "mock": True,
            }
        elif name == "get_file_contents":
            path = arguments.get("path", "unknown")
            return {
                "tool": name,
                "content": [
                    f"# Mock content for {path}\ndef authenticate_user(token):\n    return verify_signature(token)\n"
                ],
                "is_error": False,
                "mock": True,
            }
        elif name in ("create_issue", "create_pull_request", "create_or_update_file"):
            return {
                "tool": name,
                "content": [f"Simulated execution of {name} with arguments {arguments}"],
                "is_error": False,
                "mock": True,
            }
        return {
            "tool": name,
            "content": [f"Mock result for {name}"],
            "is_error": False,
            "mock": True,
        }
