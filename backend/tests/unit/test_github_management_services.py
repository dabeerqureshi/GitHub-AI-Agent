"""Unit tests for Phase 5 GitHub Management Services (Issues, PRs, and Actions)."""

import pytest

from app.agent.tools.mcp_github import GitHubMCPClient
from app.services.github_actions import GitHubActionsService
from app.services.github_issues import GitHubIssueService, validate_repo_reference
from app.services.github_pull_requests import GitHubPRService


@pytest.fixture
def mcp_client():
    """Create offline mock MCP client."""
    return GitHubMCPClient(mock_mode=True)


@pytest.fixture
def issue_service(mcp_client):
    return GitHubIssueService(mcp_client)


@pytest.fixture
def pr_service(mcp_client):
    return GitHubPRService(mcp_client)


@pytest.fixture
def actions_service(mcp_client):
    return GitHubActionsService(mcp_client)


# --- REPOSITORY REFERENCE VALIDATION TESTS ---


def test_repo_reference_validation():
    """Verify strict validation of owner/repo strings."""
    owner, repo = validate_repo_reference("octocat/Hello-World")
    assert owner == "octocat"
    assert repo == "Hello-World"

    with pytest.raises(ValueError, match="Invalid repository reference"):
        validate_repo_reference("invalid-repo-without-slash")

    with pytest.raises(ValueError, match="Invalid repository reference"):
        validate_repo_reference("owner/repo/extra")


# --- ISSUE AGENT SERVICE TESTS ---


@pytest.mark.asyncio
async def test_issue_service_search_and_list_assigned(issue_service):
    """Test searching issues and listing assigned issues with pagination."""
    repo = "octocat/Hello-World"

    # Search issues
    search_res = await issue_service.search_issues(repo, query="memory", state="open")
    assert search_res["is_error"] is False
    assert any("memory" in str(c).lower() for c in search_res["content"])
    assert "pagination" in search_res
    assert search_res["pagination"]["page"] == 1

    # List assigned issues
    assigned_res = await issue_service.list_assigned_issues(repo, assignee="dabeer")
    assert assigned_res["is_error"] is False
    assert any("@dabeer" in str(c) for c in assigned_res["content"])


@pytest.mark.asyncio
async def test_issue_service_mutating_lifecycle(issue_service):
    """Test issue creation, update, labeling, assignment, commenting, closing and reopening."""
    repo = "octocat/Hello-World"

    # 1. Create issue
    created = await issue_service.create_issue(
        repo,
        title="Bug: Memory Leak",
        body="Detailed description",
        labels=["bug"],
        assignees=["dabeer"],
    )
    assert created["is_error"] is False
    assert "Created Issue #104" in str(created["content"])

    # Empty title should fail
    with pytest.raises(ValueError, match="title cannot be empty"):
        await issue_service.create_issue(repo, title="   ")

    # 2. Update issue
    updated = await issue_service.update_issue(
        repo, issue_number=101, title="New Title", state="closed"
    )
    assert updated["is_error"] is False
    assert "Updated Issue #101" in str(updated["content"])

    # 3. Add labels
    labeled = await issue_service.add_labels(repo, issue_number=101, labels=["p1", "critical"])
    assert labeled["is_error"] is False
    assert "Added labels" in str(labeled["content"])

    # 4. Assign users
    assigned = await issue_service.assign_users(repo, issue_number=101, assignees=["alice", "bob"])
    assert assigned["is_error"] is False
    assert "Assigned @alice, @bob" in str(assigned["content"])

    # 5. Add comment
    commented = await issue_service.add_comment(
        repo, issue_number=101, comment="Investigating memory leak."
    )
    assert commented["is_error"] is False
    assert "Added comment" in str(commented["content"])

    # 6. Close & reopen issue
    closed = await issue_service.close_issue(repo, issue_number=101)
    assert closed["is_error"] is False
    assert "Closed Issue #101" in str(closed["content"])

    reopened = await issue_service.reopen_issue(repo, issue_number=101)
    assert reopened["is_error"] is False
    assert "Reopened Issue #101" in str(reopened["content"])


# --- PULL REQUEST AGENT SERVICE TESTS ---


@pytest.mark.asyncio
async def test_pr_service_read_operations(pr_service):
    """Test listing PRs, inspecting details, changed files, diffs, and commits."""
    repo = "octocat/Hello-World"

    # List PRs
    prs = await pr_service.list_pull_requests(repo, state="open")
    assert prs["is_error"] is False
    assert any("PR #42" in str(c) for c in prs["content"])

    # Inspect PR details
    detail = await pr_service.get_pull_request(repo, pull_number=42)
    assert detail["is_error"] is False
    assert "PR #42" in str(detail["content"])

    # Changed files
    files = await pr_service.get_changed_files(repo, pull_number=42)
    assert files["is_error"] is False
    assert any("dedup.py" in str(c) for c in files["content"])

    # Diff
    diff = await pr_service.get_diff(repo, pull_number=42)
    assert diff["is_error"] is False
    assert "diff --git" in str(diff["content"])

    # Commits
    commits = await pr_service.analyze_commits(repo, pull_number=42)
    assert commits["is_error"] is False
    assert any("feat(dedup)" in str(c) for c in commits["content"])

    # Automated code review
    review = await pr_service.review_code(repo, pull_number=42)
    assert review["is_error"] is False
    assert "Automated Code Review" in str(review["content"])


@pytest.mark.asyncio
async def test_pr_service_mutating_operations(pr_service):
    """Test PR creation, comments, formal reviews, and merging."""
    repo = "octocat/Hello-World"

    # Create PR
    created = await pr_service.create_pull_request(
        repo, title="feat: new feature", head="feature/branch", base="main", body="PR description"
    )
    assert created["is_error"] is False
    assert "Created PR #44" in str(created["content"])

    # Create review comment
    comment = await pr_service.create_review_comment(
        repo, pull_number=42, body="Consider caching this value", path="services/dedup.py", line=15
    )
    assert comment["is_error"] is False
    assert "Created review comment" in str(comment["content"])

    # Submit review
    review_sub = await pr_service.submit_review(repo, pull_number=42, event="APPROVE", body="LGTM!")
    assert review_sub["is_error"] is False
    assert "Submitted review" in str(review_sub["content"])

    # Merge PR
    merged = await pr_service.merge_pull_request(repo, pull_number=42, merge_method="squash")
    assert merged["is_error"] is False
    assert "Merged PR #42" in str(merged["content"])


# --- GITHUB ACTIONS AGENT SERVICE TESTS ---


@pytest.mark.asyncio
async def test_actions_service_diagnostics_and_rerun(actions_service):
    """Test listing workflows, runs, step diagnostics, recommendations, and re-running runs."""
    repo = "octocat/Hello-World"

    # List workflows
    workflows = await actions_service.list_workflows(repo)
    assert workflows["is_error"] is False
    assert any("CI / Test" in str(c) for c in workflows["content"])

    # List workflow runs
    runs = await actions_service.list_workflow_runs(repo)
    assert runs["is_error"] is False
    assert any("Run #89" in str(c) for c in runs["content"])

    # Job status
    jobs = await actions_service.get_job_status(repo, run_id=89)
    assert jobs["is_error"] is False
    assert any("test-backend" in str(c) for c in jobs["content"])

    # Logs
    logs = await actions_service.get_logs(repo, run_id=89)
    assert logs["is_error"] is False
    assert "FAIL" in str(logs["content"])

    # Step failure diagnosis & recommendation
    diag = await actions_service.diagnose_and_recommend(repo, run_id=89)
    assert diag["is_error"] is False
    assert "Automated Failure Diagnosis" in str(diag["content"])
    assert "Recommended Fix" in str(diag["content"])

    # Re-run workflow (mutating)
    rerun = await actions_service.rerun_workflow(repo, run_id=89)
    assert rerun["is_error"] is False
    assert "Triggered re-run" in str(rerun["content"])


# --- RATE LIMIT AND QUOTA TESTS ---


@pytest.mark.asyncio
async def test_mcp_client_rate_limiting(mcp_client):
    """Verify rate-limit tracking and exhaustion enforcement."""
    status_initial = mcp_client.get_rate_limit()
    assert status_initial["remaining"] == 5000

    await mcp_client.execute_tool("list_repositories", {})
    status_after = mcp_client.get_rate_limit()
    assert status_after["remaining"] == 4999

    # Test rate limit exhaustion
    mcp_client.rate_limit_remaining = 0
    with pytest.raises(RuntimeError, match="rate limit exceeded"):
        await mcp_client.execute_tool("list_repositories", {})
