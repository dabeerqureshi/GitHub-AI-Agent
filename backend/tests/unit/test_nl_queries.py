"""Comprehensive unit tests for natural-language agent queries, model routing, and privacy guardrails."""

import pytest

from app.agent.graph import GitHubAgentWorkflow
from app.agent.router import (
    ChatCompletionResponse,
    MockLLMClient,
    ModelRouter,
    contains_private_code,
)
from app.agent.tools.mcp_github import GitHubMCPClient
from app.agent.tools.registry import ToolRegistry


@pytest.fixture
def agent_workflow():
    """Workflow configured with deterministic mock client."""
    mock_llm = MockLLMClient(
        [
            ChatCompletionResponse(
                content="I am GitHub AI Workspace assistant.", provider="mock", model="m1"
            ),
        ]
    )
    mock_mcp = GitHubMCPClient(mock_mode=True)
    registry = ToolRegistry(mcp_client=mock_mcp)
    return GitHubAgentWorkflow(llm_client=mock_llm, tool_registry=registry)


@pytest.mark.asyncio
async def test_nl_show_repositories(agent_workflow: GitHubAgentWorkflow):
    """Test 'Show my repositories' query."""
    state = {
        "conversation_id": "test-c1",
        "messages": [{"role": "user", "content": "Show my repositories"}],
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
        "metadata": None,
    }
    result = await agent_workflow.graph.ainvoke(state)
    assert result["intent"] == "SHOW_REPOSITORIES"
    assert result["tool_result"]["tool"] == "list_repositories"
    assert "Verified Operation: `list_repositories`" in result["final_response"]


@pytest.mark.asyncio
async def test_nl_find_open_issues(agent_workflow: GitHubAgentWorkflow):
    """Test 'Find my open issues' query."""
    state = {
        "conversation_id": "test-c2",
        "messages": [{"role": "user", "content": "Find my open issues in octocat/Hello-World"}],
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
        "metadata": None,
    }
    result = await agent_workflow.graph.ainvoke(state)
    assert result["intent"] == "FIND_OPEN_ISSUES"
    assert result["tool_result"]["tool"] == "list_issues"
    assert "Issue #101" in result["final_response"]


@pytest.mark.asyncio
async def test_nl_explain_latest_commit(agent_workflow: GitHubAgentWorkflow):
    """Test 'Explain the latest commit' query."""
    state = {
        "conversation_id": "test-c3",
        "messages": [
            {"role": "user", "content": "Explain the latest commit in octocat/Hello-World"}
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
        "metadata": None,
    }
    result = await agent_workflow.graph.ainvoke(state)
    assert result["intent"] == "EXPLAIN_LATEST_COMMIT"
    assert result["tool_result"]["tool"] == "get_commit"
    assert "Commit a8f2d1e" in result["final_response"]


@pytest.mark.asyncio
async def test_nl_review_pull_request(agent_workflow: GitHubAgentWorkflow):
    """Test 'Review pull request 42' query."""
    state = {
        "conversation_id": "test-c4",
        "messages": [{"role": "user", "content": "Review pull request 42 in facebook/react"}],
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
        "metadata": None,
    }
    result = await agent_workflow.graph.ainvoke(state)
    assert result["intent"] == "REVIEW_PULL_REQUEST"
    assert result["tool_result"]["tool"] == "get_pull_request"
    assert "Verified Code Review" in result["final_response"]
    assert "PR #42" in result["final_response"]


@pytest.mark.asyncio
async def test_nl_find_auth_code(agent_workflow: GitHubAgentWorkflow):
    """Test 'Find authentication-related code' query."""
    state = {
        "conversation_id": "test-c5",
        "messages": [
            {"role": "user", "content": "Find authentication-related code in octocat/Hello-World"}
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
        "metadata": None,
    }
    result = await agent_workflow.graph.ainvoke(state)
    assert result["intent"] == "FIND_AUTH_CODE"
    assert result["tool_result"]["tool"] == "search_code"
    assert "AuthProvider" in result["final_response"]


@pytest.mark.asyncio
async def test_nl_create_bug_report_requires_approval(agent_workflow: GitHubAgentWorkflow):
    """Test 'Create a bug report' query halts for human-in-the-loop approval."""
    state = {
        "conversation_id": "test-c6",
        "messages": [
            {
                "role": "user",
                "content": "Create a bug report for login freeze in octocat/Hello-World",
            }
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
        "metadata": None,
    }
    result = await agent_workflow.graph.ainvoke(state)
    assert result["intent"] == "CREATE_BUG_REPORT"
    assert result.get("pending_approval") is not None
    assert result["pending_approval"]["tool_name"] == "create_issue"
    assert len(result["pending_approval"]["action_hash"]) == 64
    assert result["approval_status"] == "PENDING"
    assert result.get("tool_result") is None


@pytest.mark.asyncio
async def test_nl_explain_failing_workflows(agent_workflow: GitHubAgentWorkflow):
    """Test 'Explain failing workflows' query."""
    state = {
        "conversation_id": "test-c7",
        "messages": [
            {"role": "user", "content": "Explain failing workflows in octocat/Hello-World"}
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
        "metadata": None,
    }
    result = await agent_workflow.graph.ainvoke(state)
    assert result["intent"] == "EXPLAIN_FAILING_WORKFLOWS"
    assert result["tool_result"]["tool"] == "list_workflow_runs"
    assert "Verified Actions Diagnostics" in result["final_response"]
    assert "Run #89" in result["final_response"]


def test_private_code_detection_and_cloud_guardrails():
    """Verify private code detection prevents unauthorized cloud transmission."""
    snippet_code = "```python\ndef sensitive_algorithm():\n    return 42\n```"
    plain_text = "What is the status of issue 12?"

    assert contains_private_code(snippet_code) is True
    assert contains_private_code(plain_text) is False


@pytest.mark.asyncio
async def test_router_privacy_guardrail():
    """Verify router defaults to local Ollama when code is present and consent is disabled."""
    router = ModelRouter()
    # Ensure allow_cloud_code is False
    router.allow_cloud_code = False
    router.preferred_provider = "openai"

    client = await router.get_active_client("```python\nimport secret\n```")
    # Forced to local ollama due to private code
    assert client.__class__.__name__ == "OllamaClient"
