"""Unit tests verifying natural-language GitHub management agents via LangGraph workflow."""

import pytest

from app.agent.graph import GitHubAgentWorkflow
from app.agent.router import MockLLMClient
from app.agent.tools.mcp_github import GitHubMCPClient
from app.agent.tools.registry import ToolRegistry


@pytest.fixture
def agent():
    """Create LangGraph agent connected to mock MCP client."""
    mcp_client = GitHubMCPClient(mock_mode=True)
    tool_registry = ToolRegistry(mcp_client=mcp_client)
    llm = MockLLMClient()
    return GitHubAgentWorkflow(llm_client=llm, tool_registry=tool_registry)


@pytest.mark.asyncio
async def test_agent_search_issues(agent):
    """Test: 'Search issues for memory in octocat/Hello-World'."""
    state = {
        "messages": [
            {"role": "user", "content": "Search issues for memory in octocat/Hello-World"}
        ],
        "active_repo": "octocat/Hello-World",
    }
    result = await agent.graph.ainvoke(state)
    assert result["intent"] == "SEARCH_ISSUES"
    assert result["tool_result"]["tool"] == "search_issues"
    assert "memory" in result["final_response"].lower()


@pytest.mark.asyncio
async def test_agent_list_assigned_issues(agent):
    """Test: 'Show issues assigned to me in octocat/Hello-World'."""
    state = {
        "messages": [{"role": "user", "content": "Show my assigned issues in octocat/Hello-World"}],
        "active_repo": "octocat/Hello-World",
    }
    result = await agent.graph.ainvoke(state)
    assert result["intent"] == "LIST_ASSIGNED_ISSUES"
    assert result["tool_result"]["tool"] == "list_issues"
    assert "@dabeer" in result["final_response"]


@pytest.mark.asyncio
async def test_agent_close_issue_requires_approval(agent):
    """Test: 'Close issue #101 in octocat/Hello-World' requires approval."""
    state = {
        "messages": [{"role": "user", "content": "Close issue #101 in octocat/Hello-World"}],
        "active_repo": "octocat/Hello-World",
    }
    result = await agent.graph.ainvoke(state)
    assert result["intent"] == "CLOSE_ISSUE"
    assert result["approval_status"] == "PENDING"
    assert result["pending_approval"] is not None
    assert result["pending_approval"]["tool_name"] == "close_issue"
    assert result["pending_approval"]["arguments"]["issue_number"] == 101
    assert "action_hash" in result["pending_approval"]

    # Now approve and re-invoke
    state["approval_status"] = "APPROVED"
    state["tool_to_execute"] = result["tool_to_execute"]
    resumed = await agent.graph.ainvoke(state)
    assert resumed["tool_result"]["tool"] == "close_issue"
    assert "Closed Issue #101" in resumed["final_response"]


@pytest.mark.asyncio
async def test_agent_reopen_issue_requires_approval(agent):
    """Test: 'Reopen issue #101 in octocat/Hello-World' requires approval."""
    state = {
        "messages": [{"role": "user", "content": "Reopen issue #101 in octocat/Hello-World"}],
        "active_repo": "octocat/Hello-World",
    }
    result = await agent.graph.ainvoke(state)
    assert result["intent"] == "REOPEN_ISSUE"
    assert result["approval_status"] == "PENDING"
    assert result["pending_approval"]["tool_name"] == "reopen_issue"

    # Approve and complete
    state["approval_status"] = "APPROVED"
    state["tool_to_execute"] = result["tool_to_execute"]
    resumed = await agent.graph.ainvoke(state)
    assert resumed["tool_result"]["tool"] == "reopen_issue"
    assert "Reopened Issue #101" in resumed["final_response"]


@pytest.mark.asyncio
async def test_agent_add_label_requires_approval(agent):
    """Test: 'Add label bug to issue #101 in octocat/Hello-World' requires approval."""
    state = {
        "messages": [
            {"role": "user", "content": "Add labels to issue #101 in octocat/Hello-World"}
        ],
        "active_repo": "octocat/Hello-World",
    }
    result = await agent.graph.ainvoke(state)
    assert result["intent"] == "ADD_LABEL_ISSUE"
    assert result["approval_status"] == "PENDING"
    assert result["pending_approval"]["tool_name"] == "add_labels_to_issue"


@pytest.mark.asyncio
async def test_agent_assign_issue_requires_approval(agent):
    """Test: 'Assign issue #101 to dabeer in octocat/Hello-World' requires approval."""
    state = {
        "messages": [
            {"role": "user", "content": "Assign issue #101 to dabeer in octocat/Hello-World"}
        ],
        "active_repo": "octocat/Hello-World",
    }
    result = await agent.graph.ainvoke(state)
    assert result["intent"] == "ASSIGN_ISSUE"
    assert result["approval_status"] == "PENDING"
    assert result["pending_approval"]["tool_name"] == "assign_issue"


@pytest.mark.asyncio
async def test_agent_add_comment_requires_approval(agent):
    """Test: 'Add comment on issue #101 in octocat/Hello-World' requires approval."""
    state = {
        "messages": [
            {"role": "user", "content": "Add comment on issue #101 in octocat/Hello-World"}
        ],
        "active_repo": "octocat/Hello-World",
    }
    result = await agent.graph.ainvoke(state)
    assert result["intent"] == "ADD_COMMENT"
    assert result["approval_status"] == "PENDING"
    assert result["pending_approval"]["tool_name"] == "add_issue_comment"


@pytest.mark.asyncio
async def test_agent_create_pull_request_requires_approval(agent):
    """Test: 'Create pull request in octocat/Hello-World' requires approval."""
    state = {
        "messages": [{"role": "user", "content": "Create pull request in octocat/Hello-World"}],
        "active_repo": "octocat/Hello-World",
    }
    result = await agent.graph.ainvoke(state)
    assert result["intent"] == "CREATE_PULL_REQUEST"
    assert result["approval_status"] == "PENDING"
    assert result["pending_approval"]["tool_name"] == "create_pull_request"


@pytest.mark.asyncio
async def test_agent_merge_pull_request_requires_approval(agent):
    """Test: 'Merge pull request #42 in octocat/Hello-World' requires approval."""
    state = {
        "messages": [{"role": "user", "content": "Merge pull request #42 in octocat/Hello-World"}],
        "active_repo": "octocat/Hello-World",
    }
    result = await agent.graph.ainvoke(state)
    assert result["intent"] == "MERGE_PULL_REQUEST"
    assert result["approval_status"] == "PENDING"
    assert result["pending_approval"]["tool_name"] == "merge_pull_request"

    # Approve and verify merge execution
    state["approval_status"] = "APPROVED"
    state["tool_to_execute"] = result["tool_to_execute"]
    resumed = await agent.graph.ainvoke(state)
    assert resumed["tool_result"]["tool"] == "merge_pull_request"
    assert "Merged PR #42" in resumed["final_response"]


@pytest.mark.asyncio
async def test_agent_submit_pr_review_requires_approval(agent):
    """Test: 'Approve pull request #42 in octocat/Hello-World' requires approval."""
    state = {
        "messages": [
            {"role": "user", "content": "Approve pull request #42 in octocat/Hello-World"}
        ],
        "active_repo": "octocat/Hello-World",
    }
    result = await agent.graph.ainvoke(state)
    assert result["intent"] == "SUBMIT_PR_REVIEW"
    assert result["approval_status"] == "PENDING"
    assert result["pending_approval"]["tool_name"] == "submit_pull_request_review"


@pytest.mark.asyncio
async def test_agent_get_pr_files_read_only(agent):
    """Test: 'Show PR files for #42 in octocat/Hello-World' executes read-only."""
    state = {
        "messages": [{"role": "user", "content": "Show PR files for #42 in octocat/Hello-World"}],
        "active_repo": "octocat/Hello-World",
    }
    result = await agent.graph.ainvoke(state)
    assert result["intent"] == "GET_PR_FILES"
    assert result.get("approval_status") is None or result.get("approval_status") != "PENDING"
    assert result["tool_result"]["tool"] == "get_pull_request_files"
    assert "dedup.py" in result["final_response"]


@pytest.mark.asyncio
async def test_agent_rerun_workflow_requires_approval(agent):
    """Test: 'Rerun workflow run #89 in octocat/Hello-World' requires approval."""
    state = {
        "messages": [{"role": "user", "content": "Rerun workflow run #89 in octocat/Hello-World"}],
        "active_repo": "octocat/Hello-World",
    }
    result = await agent.graph.ainvoke(state)
    assert result["intent"] == "RERUN_WORKFLOW"
    assert result["approval_status"] == "PENDING"
    assert result["pending_approval"]["tool_name"] == "rerun_workflow"
    assert result["pending_approval"]["arguments"]["run_id"] == 89

    # Approve and complete
    state["approval_status"] = "APPROVED"
    state["tool_to_execute"] = result["tool_to_execute"]
    resumed = await agent.graph.ainvoke(state)
    assert resumed["tool_result"]["tool"] == "rerun_workflow"
    assert "Triggered re-run" in resumed["final_response"]


@pytest.mark.asyncio
async def test_agent_diagnose_workflow_failure(agent):
    """Test: 'Diagnose workflow failure in octocat/Hello-World' executes read-only."""
    state = {
        "messages": [
            {"role": "user", "content": "Diagnose workflow failure in octocat/Hello-World"}
        ],
        "active_repo": "octocat/Hello-World",
    }
    result = await agent.graph.ainvoke(state)
    assert result["intent"] == "DIAGNOSE_WORKFLOW_FAILURE"
    assert result.get("approval_status") != "PENDING"
    assert result["tool_result"]["tool"] == "analyze_failing_workflow_steps"
    assert "Diagnostics for Run #89" in result["final_response"]
