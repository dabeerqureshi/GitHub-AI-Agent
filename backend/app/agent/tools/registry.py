"""Dynamic Allowlisted Tool Registry for GitHub AI Workspace."""

from collections.abc import Callable
from typing import Any

from app.agent.tools.mcp_github import (
    GitHubMCPClient,
)
from app.agent.tools.mcp_github import (
    is_mutating_tool as is_mutating_github_tool,
)


class ToolRegistry:
    """Registry managing allowlisted tools with execution validation and schema exports."""

    def __init__(self, mcp_client: GitHubMCPClient | None = None):
        self.mcp_client = mcp_client or GitHubMCPClient()
        self._local_tools: dict[str, Callable] = {}
        self._mutating_local_tools: set[str] = set()

    def register_local_tool(
        self,
        name: str,
        handler: Callable,
        is_mutating: bool = False,
        _description: str = "",
    ):
        """Register a local python tool."""
        self._local_tools[name] = handler
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
        return tools

    async def execute(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """Execute a tool safely from allowlist."""
        if tool_name in self._local_tools:
            handler = self._local_tools[tool_name]
            result = await handler(**arguments)
            return {"tool": tool_name, "content": result, "is_error": False}

        # Otherwise route through GitHub MCP client
        return await self.mcp_client.execute_tool(tool_name, arguments)
