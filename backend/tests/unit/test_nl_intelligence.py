"""Unit tests verifying natural-language repository intelligence via LangGraph agent."""

from pathlib import Path

import pytest

from app.agent.graph import GitHubAgentWorkflow
from app.agent.router import MockLLMClient
from app.agent.tools.git_local import LocalGitManager
from app.agent.tools.registry import ToolRegistry
from app.services.repo_intelligence import RepoIntelligenceService
from tests.fixtures.sample_repo import create_sample_repository


@pytest.fixture
def agent_with_sample_repo(tmp_path: Path):
    """Initialize LangGraph agent with tool registry pointing to sample repository."""
    create_sample_repository(tmp_path, owner="testorg", repo_name="sample-repo")
    git_manager = LocalGitManager(workspace_root=str(tmp_path))
    intelligence_service = RepoIntelligenceService(git_manager=git_manager)
    tool_registry = ToolRegistry(
        git_manager=git_manager,
        intelligence_service=intelligence_service,
    )
    llm = MockLLMClient()
    agent = GitHubAgentWorkflow(llm_client=llm, tool_registry=tool_registry)
    return agent


@pytest.mark.asyncio
async def test_agent_nl_architecture_summary(agent_with_sample_repo):
    """Test natural language: 'Explain architecture of testorg/sample-repo'."""
    agent = agent_with_sample_repo
    initial_state = {
        "messages": [{"role": "user", "content": "Explain architecture of testorg/sample-repo"}],
        "active_repo": "testorg/sample-repo",
    }
    result = await agent.graph.ainvoke(initial_state)

    assert result["intent"] == "ARCHITECTURE_SUMMARY"
    assert result["tool_result"]["tool"] == "repo_architecture_summary"
    response = result["final_response"]
    assert "### Verified Facts" in response
    assert "### Reasonable Inferences" in response
    assert "### Unknown Information" in response
    assert "Python" in response or "TypeScript" in response


@pytest.mark.asyncio
async def test_agent_nl_browse_files(agent_with_sample_repo):
    """Test natural language: 'Browse files in testorg/sample-repo'."""
    agent = agent_with_sample_repo
    initial_state = {
        "messages": [{"role": "user", "content": "Browse files in testorg/sample-repo"}],
        "active_repo": "testorg/sample-repo",
    }
    result = await agent.graph.ainvoke(initial_state)

    assert result["intent"] == "BROWSE_FILES"
    assert result["tool_result"]["tool"] == "repo_browse_files"
    response = result["final_response"]
    assert "README.md" in response
    assert "src" in response


@pytest.mark.asyncio
async def test_agent_nl_search_code_citations(agent_with_sample_repo):
    """Test natural language: 'Search code for Calculator in testorg/sample-repo'."""
    agent = agent_with_sample_repo
    initial_state = {
        "messages": [
            {"role": "user", "content": "Search code for Calculator in testorg/sample-repo"}
        ],
        "active_repo": "testorg/sample-repo",
    }
    result = await agent.graph.ainvoke(initial_state)

    assert result["intent"] == "SEARCH_CODE"
    assert result["tool_result"]["tool"] == "repo_search_code"
    response = result["final_response"]
    assert "### Verified Code Search Matches" in response
    assert "[src/calculator.py#" in response or "[README.md#" in response


@pytest.mark.asyncio
async def test_agent_nl_read_file_citation(agent_with_sample_repo):
    """Test natural language: 'Read file src/calculator.py in testorg/sample-repo'."""
    agent = agent_with_sample_repo
    initial_state = {
        "messages": [
            {"role": "user", "content": "Read file src/calculator.py in testorg/sample-repo"}
        ],
        "active_repo": "testorg/sample-repo",
    }
    result = await agent.graph.ainvoke(initial_state)

    assert result["intent"] == "READ_FILE"
    assert result["tool_result"]["tool"] == "repo_read_file"
    response = result["final_response"]
    assert "[src/calculator.py#L1-" in response
    assert "class Calculator:" in response


@pytest.mark.asyncio
async def test_agent_nl_compare_branches(agent_with_sample_repo):
    """Test natural language: 'Compare branches in testorg/sample-repo'."""
    agent = agent_with_sample_repo
    initial_state = {
        "messages": [{"role": "user", "content": "Compare branches in testorg/sample-repo"}],
        "active_repo": "testorg/sample-repo",
    }
    result = await agent.graph.ainvoke(initial_state)

    assert result["intent"] == "COMPARE_BRANCHES"
    assert result["tool_result"]["tool"] == "repo_compare_branches"
    response = result["final_response"]
    assert "Branch Comparison" in response
    assert "Stats" in response
