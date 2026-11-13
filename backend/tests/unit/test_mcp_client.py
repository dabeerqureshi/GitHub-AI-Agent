"""Unit tests for GitHub MCP Client."""

import pytest

from app.agent.tools.mcp_github import (
    GitHubMCPClient,
    is_mutating_tool,
)


def test_is_mutating_tool():
    """Verify tool classification into mutating vs read-only."""
    assert is_mutating_tool("create_pull_request") is True
    assert is_mutating_tool("create_or_update_file") is True
    assert is_mutating_tool("create_issue") is True
    assert is_mutating_tool("list_repositories") is False
    assert is_mutating_tool("get_file_contents") is False
    assert is_mutating_tool("search_code") is False


@pytest.mark.asyncio
async def test_mcp_client_mock_tool_listing():
    """Verify client lists available allowlisted tools in mock/test mode."""
    client = GitHubMCPClient(mock_mode=True)
    tools = await client.list_available_tools()
    tool_names = [t["name"] for t in tools]

    assert "list_repositories" in tool_names
    assert "create_pull_request" in tool_names
    assert "get_file_contents" in tool_names


@pytest.mark.asyncio
async def test_mcp_client_tool_execution():
    """Verify mock execution of read and write tools."""
    client = GitHubMCPClient(mock_mode=True)

    # Read tool
    res = await client.execute_tool("list_repositories", {})
    assert res["is_error"] is False
    assert len(res["content"]) > 0

    # Write tool
    res_write = await client.execute_tool(
        "create_issue",
        {"owner": "owner", "repo": "repo", "title": "Test Issue", "body": "Body"},
    )
    assert res_write["is_error"] is False


@pytest.mark.asyncio
async def test_mcp_client_rejects_unregistered_tools():
    """Verify client rejects arbitrary non-allowlisted tool execution."""
    client = GitHubMCPClient(mock_mode=True)
    with pytest.raises(ValueError, match="not in the allowlisted"):
        await client.execute_tool("malicious_unregistered_tool", {})
