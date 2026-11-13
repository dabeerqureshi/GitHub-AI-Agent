"""Unit tests for Autonomous Coding Agent end-to-end workflow."""

from pathlib import Path

import pytest

from app.agent.graph import GitHubAgentWorkflow
from app.agent.router import MockLLMClient
from app.agent.tools.git_local import LocalGitManager
from app.agent.tools.mcp_github import GitHubMCPClient
from app.agent.tools.registry import ToolRegistry
from app.services.coding_agent import AutonomousCodingService
from app.services.github_pull_requests import GitHubPRService
from app.services.repo_intelligence import RepoIntelligenceService
from app.services.workspace_manager import CodingWorkspaceManager
from tests.fixtures.sample_repo import create_sample_repository


@pytest.fixture
def coding_environment(tmp_path: Path):
    """Setup real git sample repo and autonomous coding service."""
    repo_dir, git_repo = create_sample_repository(
        tmp_path, owner="testorg", repo_name="sample-repo"
    )
    git_manager = LocalGitManager(workspace_root=str(tmp_path))
    workspace_manager = CodingWorkspaceManager(
        git_manager=git_manager,
        isolated_root=str(tmp_path / "worktrees"),
    )
    intelligence_service = RepoIntelligenceService(git_manager=git_manager)
    mcp_client = GitHubMCPClient(mock_mode=True)
    pr_service = GitHubPRService(mcp_client=mcp_client)
    coding_service = AutonomousCodingService(
        workspace_manager=workspace_manager,
        intelligence_service=intelligence_service,
        pr_service=pr_service,
    )

    return {
        "repo_dir": repo_dir,
        "git_repo": git_repo,
        "git_manager": git_manager,
        "workspace_manager": workspace_manager,
        "coding_service": coding_service,
        "owner": "testorg",
        "repo": "sample-repo",
    }


def test_coding_investigate_and_plan(coding_environment):
    """Verify investigating codebase symbols and forming implementation plan."""
    service: AutonomousCodingService = coding_environment["coding_service"]
    owner = coding_environment["owner"]
    repo = coding_environment["repo"]

    investigation = service.investigate(owner, repo, "Fix add method in calculator")

    assert investigation["target_repo"] == f"{owner}/{repo}"
    assert len(investigation["plan"]) > 0
    assert any("worktree" in step for step in investigation["plan"])
    assert any("calculator.py" in m.get("path", "") for m in investigation["relevant_matches"])


@pytest.mark.asyncio
async def test_successful_code_modification_workflow(coding_environment):
    """Verify successful code modification in isolated worktree with verified test pass."""
    service: AutonomousCodingService = coding_environment["coding_service"]
    owner = coding_environment["owner"]
    repo = coding_environment["repo"]

    # Valid modification that passes tests
    updated_code = (
        '"""Calculator module with arithmetic operations."""\n\n'
        "class Calculator:\n"
        '    """A basic arithmetic calculator."""\n\n'
        "    def add(self, a: int, b: int) -> int:\n"
        '        """Return sum of a and b."""\n'
        "        return a + b\n\n"
        "    def multiply(self, a: int, b: int) -> int:\n"
        "        return a * b\n"
    )

    result = await service.execute_task_in_worktree(
        owner=owner,
        repo=repo,
        task_prompt="Optimize calculator add method",
        file_edits={"src/calculator.py": updated_code},
        branch_name="fix-add-opt",
        test_command="pytest",
    )

    # Must be verified because tests pass
    assert result["tests_passed"] is True
    assert result["is_verified"] is True
    assert "diff" in result
    assert result["diff"]["total_files"] == 1
    assert "pending_approval" in result
    assert result["pending_approval"]["tool_name"] == "push_and_create_pr"
    assert "action_hash" in result["pending_approval"]


@pytest.mark.asyncio
async def test_failed_tests_reports_unverified(coding_environment):
    """Verify that if tests fail, fix is marked UNVERIFIED and does not claim success."""
    service: AutonomousCodingService = coding_environment["coding_service"]
    owner = coding_environment["owner"]
    repo = coding_environment["repo"]

    # Buggy modification that breaks tests: 2 + 3 != 999
    broken_code = (
        "class Calculator:\n    def add(self, a: int, b: int) -> int:\n        return 999\n"
    )

    result = await service.execute_task_in_worktree(
        owner=owner,
        repo=repo,
        task_prompt="Introduce broken logic",
        file_edits={"src/calculator.py": broken_code},
        branch_name="broken-branch",
        test_command="pytest",
    )

    # Agent must NOT claim success when tests fail!
    assert result["tests_passed"] is False
    assert result["is_verified"] is False
    assert result["review"]["verified"] is False
    assert (
        "FAILED" in result["test_output"]
        or "FAIL" in result["test_output"]
        or result["review"]["exit_code"] != 0
    )


@pytest.mark.asyncio
async def test_agent_graph_autonomous_coding_intent(coding_environment):
    """Verify LangGraph agent routes 'Fix bug...' to autonomous coding and pauses for approval."""
    coding_service = coding_environment["coding_service"]
    git_manager = coding_environment["git_manager"]
    owner = coding_environment["owner"]
    repo = coding_environment["repo"]

    tool_registry = ToolRegistry(
        git_manager=git_manager,
        intelligence_service=coding_service.intelligence_service,
    )
    # Inject our active coding service
    tool_registry.coding_service = coding_service
    tool_registry._local_tools["autonomous_code_fix"] = coding_service.execute_task_in_worktree

    llm = MockLLMClient()
    agent = GitHubAgentWorkflow(llm_client=llm, tool_registry=tool_registry)

    state = {
        "messages": [
            {"role": "user", "content": f"Fix bug in src/calculator.py in {owner}/{repo}"}
        ],
        "active_repo": f"{owner}/{repo}",
    }

    result = await agent.graph.ainvoke(state)

    assert result["intent"] == "AUTONOMOUS_CODING"
    assert result["approval_status"] == "PENDING"
    assert result["pending_approval"] is not None
    assert result["pending_approval"]["tool_name"] == "autonomous_code_fix"
    assert "action_hash" in result["pending_approval"]
