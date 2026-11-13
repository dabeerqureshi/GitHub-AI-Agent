"""Unit tests for LangGraph agent workflow."""

import pytest

from app.agent.graph import GitHubAgentWorkflow
from app.agent.router import ChatCompletionResponse, MockLLMClient
from app.agent.tools.mcp_github import GitHubMCPClient
from app.agent.tools.registry import ToolRegistry


@pytest.fixture
def test_workflow():
    """Workflow configured with Mock LLM and Mock MCP tools."""
    mock_llm = MockLLMClient(
        [
            ChatCompletionResponse(
                content="I can help you with GitHub.", provider="mock", model="m1"
            ),
        ]
    )
    mock_mcp = GitHubMCPClient(mock_mode=True)
    registry = ToolRegistry(mcp_client=mock_mcp)
    return GitHubAgentWorkflow(llm_client=mock_llm, tool_registry=registry)


@pytest.mark.asyncio
async def test_workflow_direct_response(test_workflow: GitHubAgentWorkflow):
    """Test standard conversational query that does not invoke a tool."""
    state = {
        "conversation_id": "test-c1",
        "messages": [{"role": "user", "content": "Hello, how can you help me?"}],
        "active_repo": None,
        "intent": None,
        "plan": [],
        "current_step": 1,
        "tool_to_execute": None,
        "pending_approval": None,
        "approval_status": None,
        "tool_result": None,
        "final_response": None,
        "error": None,
    }

    result = await test_workflow.graph.ainvoke(state)
    assert result["final_response"] is not None
    assert len(result["messages"]) == 2  # user + assistant
    assert result.get("pending_approval") is None


@pytest.mark.asyncio
async def test_workflow_read_only_tool_execution(test_workflow: GitHubAgentWorkflow):
    """Test read-only tool invocation executes immediately without pausing."""
    state = {
        "conversation_id": "test-c2",
        "messages": [{"role": "user", "content": "Please list my repositories in GitHub"}],
        "active_repo": None,
        "intent": None,
        "plan": [],
        "current_step": 1,
        "tool_to_execute": None,
        "pending_approval": None,
        "approval_status": None,
        "tool_result": None,
        "final_response": None,
        "error": None,
    }

    result = await test_workflow.graph.ainvoke(state)
    assert result.get("pending_approval") is None
    assert result["tool_result"] is not None
    assert result["tool_result"]["tool"] == "list_repositories"
    assert "Verified Operation" in result["final_response"]


@pytest.mark.asyncio
async def test_workflow_mutating_tool_pauses_for_approval(test_workflow: GitHubAgentWorkflow):
    """Test mutating tool (create_issue) pauses at approval gate with cryptographic hash."""
    state = {
        "conversation_id": "test-c3",
        "messages": [
            {"role": "user", "content": "Please create issue in facebook/react for a button bug"}
        ],
        "active_repo": None,
        "intent": None,
        "plan": [],
        "current_step": 1,
        "tool_to_execute": None,
        "pending_approval": None,
        "approval_status": None,
        "tool_result": None,
        "final_response": None,
        "error": None,
    }

    result = await test_workflow.graph.ainvoke(state)
    pending = result.get("pending_approval")
    assert pending is not None
    assert pending["tool_name"] == "create_issue"
    assert len(pending["action_hash"]) == 64
    assert result.get("approval_status") == "PENDING"
    # Tool result should not be present yet
    assert result.get("tool_result") is None
