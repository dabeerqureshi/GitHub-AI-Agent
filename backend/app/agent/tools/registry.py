"""Dynamic Allowlisted Tool Registry for GitHub AI Workspace."""

from collections.abc import Callable
from typing import Any

from app.agent.tools.git_local import LocalGitManager
from app.agent.tools.mcp_github import (
    GitHubMCPClient,
)
from app.agent.tools.mcp_github import (
    is_mutating_tool as is_mutating_github_tool,
)
from app.agent.tools.test_runner import TestRunner
from app.services.repo_intelligence import RepoIntelligenceService


class ToolRegistry:
    """Registry managing allowlisted tools with execution validation and schema exports."""

    def __init__(
        self,
        mcp_client: GitHubMCPClient | None = None,
        git_manager: LocalGitManager | None = None,
        test_runner: TestRunner | None = None,
        intelligence_service: RepoIntelligenceService | None = None,
    ):
        self.mcp_client = mcp_client or GitHubMCPClient()
        self.git_manager = git_manager or LocalGitManager()
        self.test_runner = test_runner or TestRunner()
        self.intelligence_service = intelligence_service or RepoIntelligenceService(
            self.git_manager
        )

        self._local_tools: dict[str, Callable] = {}
        self._mutating_local_tools: set[str] = set()
        self._tool_descriptions: dict[str, str] = {}

        # Register local Git and verification tools
        self._register_default_tools()

    def _register_default_tools(self):
        """Register default local sandboxed git and testing tools."""
        self.register_local_tool(
            name="git_status",
            handler=self.git_manager.get_repo_status,
            is_mutating=False,
            description="Get local git repository status, branch, and modified files.",
        )
        self.register_local_tool(
            name="git_init_or_clone",
            handler=self.git_manager.init_or_clone_repo,
            is_mutating=False,
            description="Initialize or clone repository into workspace.",
        )
        self.register_local_tool(
            name="git_create_branch",
            handler=self.git_manager.create_branch,
            is_mutating=True,
            description="Create and switch to a new local git branch.",
        )
        self.register_local_tool(
            name="git_write_file",
            handler=self.git_manager.write_file,
            is_mutating=True,
            description="Write or modify a file in the local repository.",
        )
        self.register_local_tool(
            name="git_diff",
            handler=self.git_manager.get_diff,
            is_mutating=False,
            description="View unified diff of current local changes.",
        )
        self.register_local_tool(
            name="git_commit",
            handler=self.git_manager.commit,
            is_mutating=True,
            description="Stage and commit changes to local repository.",
        )
        self.register_local_tool(
            name="run_repository_tests",
            handler=self.test_runner.run_tests,
            is_mutating=False,
            description="Execute automated tests in repository.",
        )
        self.register_local_tool(
            name="repo_browse_files",
            handler=self.intelligence_service.browse_files,
            is_mutating=False,
            description="Browse files and directories in repository.",
        )
        self.register_local_tool(
            name="repo_read_file",
            handler=self.intelligence_service.get_file_content_with_lines,
            is_mutating=False,
            description="Read file content with line numbers and citations.",
        )
        self.register_local_tool(
            name="repo_compare_branches",
            handler=self.intelligence_service.compare_branches,
            is_mutating=False,
            description="Compare commits and changes between two branches.",
        )
        self.register_local_tool(
            name="repo_search_code",
            handler=self.intelligence_service.search_code,
            is_mutating=False,
            description="Search code symbols, tokens, or text across repository files with line citations.",
        )
        self.register_local_tool(
            name="repo_architecture_summary",
            handler=self.intelligence_service.generate_architecture_summary,
            is_mutating=False,
            description="Generate structured architecture assessment with facts and inferences.",
        )

    def register_local_tool(
        self,
        name: str,
        handler: Callable,
        is_mutating: bool = False,
        description: str = "",
    ):
        """Register a local python tool."""
        self._local_tools[name] = handler
        self._tool_descriptions[name] = description
        if is_mutating:
            self._mutating_local_tools.add(name)

    def is_mutating(self, tool_name: str) -> bool:
        """Return True if tool performs mutating side-effects."""
        if tool_name in self._local_tools:
            return tool_name in self._mutating_local_tools
        return is_mutating_github_tool(tool_name)

    async def get_tool_definitions(self) -> list[dict[str, Any]]:
        """Return schema definitions of all registered tools for LLM binding."""
        mcp_tools = await self.mcp_client.list_available_tools()
        tools = []
        for t in mcp_tools:
            tools.append(
                {
                    "name": t["name"],
                    "description": t.get("description", f"GitHub tool: {t['name']}"),
                    "is_mutating": self.is_mutating(t["name"]),
                    "parameters": t.get("input_schema", {"type": "object", "properties": {}}),
                }
            )
        for name in self._local_tools:
            tools.append(
                {
                    "name": name,
                    "description": self._tool_descriptions.get(name, f"Local tool: {name}"),
                    "is_mutating": self.is_mutating(name),
                    "parameters": {"type": "object", "properties": {}},
                }
            )
        return tools

    async def execute(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """Execute a tool safely from allowlist."""
        if tool_name in self._local_tools:
            handler = self._local_tools[tool_name]
            import inspect

            if inspect.iscoroutinefunction(handler):
                result = await handler(**arguments)
            else:
                result = handler(**arguments)
            return {"tool": tool_name, "content": result, "is_error": False}

        # Otherwise route through GitHub MCP client
        return await self.mcp_client.execute_tool(tool_name, arguments)
