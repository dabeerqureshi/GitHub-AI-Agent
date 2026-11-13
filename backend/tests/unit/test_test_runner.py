"""Unit tests for TestRunner."""

import tempfile

import pytest

from app.agent.tools.test_runner import TestRunner


@pytest.fixture
def temp_workspace():
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


@pytest.mark.asyncio
async def test_run_tests_success(temp_workspace: str):
    """Verify running a successful shell test command."""
    import os

    repo_dir = os.path.join(temp_workspace, "testorg", "sample-repo")
    os.makedirs(repo_dir, exist_ok=True)

    runner = TestRunner(workspace_root=temp_workspace)
    res = await runner.run_tests("testorg", "sample-repo", custom_command="echo 'ALL TESTS PASSED'")
    assert res["success"] is True
    assert "ALL TESTS PASSED" in res["output"]
    assert res["duration_seconds"] >= 0


@pytest.mark.asyncio
async def test_run_tests_timeout(temp_workspace: str):
    """Verify test runner kills hanging processes upon timeout."""
    import os

    repo_dir = os.path.join(temp_workspace, "testorg", "sample-repo")
    os.makedirs(repo_dir, exist_ok=True)

    runner = TestRunner(workspace_root=temp_workspace, default_timeout_seconds=1)
    res = await runner.run_tests("testorg", "sample-repo", custom_command="sleep 5")
    assert res["success"] is False
    assert "timed out" in res["error"]
