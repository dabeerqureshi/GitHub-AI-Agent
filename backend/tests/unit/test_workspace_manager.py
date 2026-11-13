"""Unit tests for Isolated Git Worktree and Coding Workspace Manager."""

from pathlib import Path

import pytest

from app.agent.tools.git_local import GitSecurityException, LocalGitManager
from app.services.workspace_manager import (
    CodingWorkspaceManager,
    DiskQuotaExceededException,
    IsolatedWorkspace,
)
from tests.fixtures.sample_repo import create_sample_repository


@pytest.fixture
def workspace_setup(tmp_path: Path):
    """Setup git repository and workspace manager in temporary root."""
    repo_dir, git_repo = create_sample_repository(
        tmp_path, owner="testorg", repo_name="sample-repo"
    )
    git_manager = LocalGitManager(workspace_root=str(tmp_path))
    isolated_root = tmp_path / "isolated_worktrees"
    manager = CodingWorkspaceManager(git_manager=git_manager, isolated_root=str(isolated_root))
    return {
        "repo_dir": repo_dir,
        "git_repo": git_repo,
        "git_manager": git_manager,
        "manager": manager,
        "owner": "testorg",
        "repo": "sample-repo",
    }


def test_create_isolated_worktree(workspace_setup):
    """Verify creating an isolated git worktree with dedicated branch."""
    manager = workspace_setup["manager"]
    owner = workspace_setup["owner"]
    repo = workspace_setup["repo"]

    ws: IsolatedWorkspace = manager.create_isolated_worktree(
        owner=owner, repo=repo, branch_name="fix-calculator-bug", base_branch="main"
    )

    assert ws.workspace_id.startswith("ws-")
    assert ws.owner == owner
    assert ws.repo == repo
    assert ws.branch_name == "fix-calculator-bug"
    worktree_path = Path(ws.worktree_path)
    assert worktree_path.exists()
    assert (worktree_path / "src" / "calculator.py").exists()

    # Verify isolated from original directory
    orig_dir = workspace_setup["repo_dir"]
    assert worktree_path != orig_dir


def test_worktree_file_write_and_containment(workspace_setup):
    """Verify safe writing and path traversal prevention."""
    manager = workspace_setup["manager"]
    owner = workspace_setup["owner"]
    repo = workspace_setup["repo"]

    ws = manager.create_isolated_worktree(owner, repo, "branch-safe-write")

    # Safe write
    res = manager.write_file(ws, "src/calculator.py", "# New Content\nclass Calculator: pass\n")
    assert res["status"] == "written"
    written_path = Path(ws.worktree_path) / "src" / "calculator.py"
    assert "New Content" in written_path.read_text(encoding="utf-8")

    # Path traversal attempt
    with pytest.raises(GitSecurityException, match="Path traversal detected"):
        manager.write_file(ws, "../../escaped.py", "malicious payload")


def test_worktree_disk_quota_enforcement(workspace_setup):
    """Verify disk usage limits reject excessive payloads."""
    manager = workspace_setup["manager"]
    owner = workspace_setup["owner"]
    repo = workspace_setup["repo"]

    # Tiny limit of 50 bytes
    manager.default_disk_limit = 50
    ws = manager.create_isolated_worktree(owner, repo, "branch-quota-test")

    large_payload = "A" * 1000
    with pytest.raises(DiskQuotaExceededException, match="exceeds workspace quota"):
        manager.write_file(ws, "overflow.txt", large_payload)


def test_worktree_diff_generation(workspace_setup):
    """Verify unified and structured diff parsing in worktree."""
    manager = workspace_setup["manager"]
    owner = workspace_setup["owner"]
    repo = workspace_setup["repo"]

    ws = manager.create_isolated_worktree(owner, repo, "branch-diff-test")
    manager.write_file(
        ws,
        "src/calculator.py",
        "class Calculator:\n    def add(self, a, b):\n        # modified\n        return a + b\n",
    )

    # Raw diff
    raw_diff = manager.get_diff(ws)
    assert "diff --git" in raw_diff
    assert "# modified" in raw_diff

    # Structured diff
    structured = manager.get_structured_diff(ws)
    assert structured["total_files"] == 1
    assert structured["total_additions"] > 0
    assert structured["files"][0]["filename"] == "src/calculator.py"


def test_worktree_cleanup(workspace_setup):
    """Verify clean worktree removal."""
    manager = workspace_setup["manager"]
    owner = workspace_setup["owner"]
    repo = workspace_setup["repo"]

    ws = manager.create_isolated_worktree(owner, repo, "branch-cleanup-test")
    worktree_path = Path(ws.worktree_path)
    assert worktree_path.exists()

    success = manager.cleanup_workspace(ws)
    assert success is True
    assert not worktree_path.exists()
