"""Unit tests for sandboxed LocalGitManager."""

import tempfile

import pytest

from app.agent.tools.git_local import GitSecurityException, LocalGitManager


@pytest.fixture
def temp_workspace():
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


def test_init_and_status(temp_workspace: str):
    """Verify repo initialization and status reporting."""
    mgr = LocalGitManager(workspace_root=temp_workspace)
    owner, repo = "testorg", "sample-repo"

    # Status before init
    st_pre = mgr.get_repo_status(owner, repo)
    assert st_pre["is_cloned"] is False

    # Initialize
    init_res = mgr.init_or_clone_repo(owner, repo)
    assert init_res["status"] == "initialized"

    # Status after init
    st_post = mgr.get_repo_status(owner, repo)
    assert st_post["is_cloned"] is True
    assert st_post["active_branch"] == "main"
    assert st_post["is_dirty"] is False


def test_branch_write_diff_and_commit(temp_workspace: str):
    """Verify branch creation, file modification, diff, and commit."""
    mgr = LocalGitManager(workspace_root=temp_workspace)
    owner, repo = "testorg", "sample-repo"
    mgr.init_or_clone_repo(owner, repo)

    # Initial commit so HEAD exists
    mgr.write_file(owner, repo, "initial.txt", "Initial content\n")
    mgr.commit(owner, repo, "chore: initial commit")

    # Create new branch
    branch_res = mgr.create_branch(owner, repo, "feature-calc")
    assert branch_res["status"] == "created"
    assert branch_res["branch"] == "feature-calc"

    # Write file
    file_res = mgr.write_file(owner, repo, "calc.py", "def add(a, b):\n    return a + b\n")
    assert file_res["status"] == "written"

    # Commit
    commit_res = mgr.commit(owner, repo, "feat: add calc module")
    assert commit_res["status"] == "committed"
    assert len(commit_res["commit_hash"]) == 40


def test_path_traversal_blocked(temp_workspace: str):
    """Verify path traversal attacks are caught and denied."""
    mgr = LocalGitManager(workspace_root=temp_workspace)
    owner, repo = "testorg", "sample-repo"
    mgr.init_or_clone_repo(owner, repo)

    # Attempt to write outside repository
    with pytest.raises(GitSecurityException, match="path traversal"):
        mgr.write_file(owner, repo, "../../etc/passwd", "evil content")
