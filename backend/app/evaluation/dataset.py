"""Ground-truth Evaluation Benchmark Dataset for GitHub AI Workspace."""

from pydantic import BaseModel, Field


class EvaluationCase(BaseModel):
    """A benchmark test case with expected ground-truth outcomes."""

    id: str
    query: str
    active_repo: str | None = None
    expected_intent: str
    expected_role: str
    expected_tool: str | None = None
    expected_repo: str | None = None
    expected_mutation: bool = False
    expected_approval_required: bool = False
    expected_citations: list[str] = Field(default_factory=list)
    category: str = "standard"  # standard, edge_case, failure_case, security_boundary


BENCHMARK_DATASET: list[EvaluationCase] = [
    # 1. Specialized Roles: Repository Analyst
    EvaluationCase(
        id="eval-01",
        query="Analyze the entire repository architecture and structure for facebook/react",
        active_repo="facebook/react",
        expected_intent="ANALYZE_REPOSITORY",
        expected_role="Repository Analyst",
        expected_tool="analyze_entire_repository",
        expected_repo="facebook/react",
        expected_mutation=False,
        expected_approval_required=False,
        category="standard",
    ),
    EvaluationCase(
        id="eval-02",
        query="Identify technical debt and code smells in pallets/flask",
        active_repo="pallets/flask",
        expected_intent="IDENTIFY_TECH_DEBT",
        expected_role="Repository Analyst",
        expected_tool="identify_technical_debt",
        expected_repo="pallets/flask",
        expected_mutation=False,
        expected_approval_required=False,
        category="standard",
    ),
    EvaluationCase(
        id="eval-03",
        query="Find potentially duplicated code across modules in octocat/Hello-World",
        active_repo="octocat/Hello-World",
        expected_intent="FIND_CODE_DUPLICATION",
        expected_role="Repository Analyst",
        expected_tool="find_code_duplication",
        expected_repo="octocat/Hello-World",
        expected_mutation=False,
        expected_approval_required=False,
        category="standard",
    ),
    EvaluationCase(
        id="eval-04",
        query="Generate a development plan for adding OAuth authentication in octocat/Hello-World",
        active_repo="octocat/Hello-World",
        expected_intent="GENERATE_DEV_PLAN",
        expected_role="Repository Analyst",
        expected_tool="generate_development_plan",
        expected_repo="octocat/Hello-World",
        expected_mutation=False,
        expected_approval_required=False,
        category="standard",
    ),
    # 2. Specialized Roles: Coding Agent
    EvaluationCase(
        id="eval-05",
        query="Investigate production bug with NullPointerException in octocat/Hello-World",
        active_repo="octocat/Hello-World",
        expected_intent="INVESTIGATE_PRODUCTION_BUG",
        expected_role="Coding Agent",
        expected_tool="investigate_production_bug",
        expected_repo="octocat/Hello-World",
        expected_mutation=False,
        expected_approval_required=False,
        category="standard",
    ),
    EvaluationCase(
        id="eval-06",
        query="Generate tests for modified functionality in calculator.py for octocat/Hello-World",
        active_repo="octocat/Hello-World",
        expected_intent="GENERATE_TESTS_FOR_CODE",
        expected_role="Coding Agent",
        expected_tool="generate_tests_for_code",
        expected_repo="octocat/Hello-World",
        expected_mutation=False,
        expected_approval_required=False,
        category="standard",
    ),
    EvaluationCase(
        id="eval-07",
        query="Implement multi-file feature for user profiles in octocat/Hello-World",
        active_repo="octocat/Hello-World",
        expected_intent="MULTI_FILE_FEATURE_IMPLEMENTATION",
        expected_role="Coding Agent",
        expected_tool="implement_multi_file_feature",
        expected_repo="octocat/Hello-World",
        expected_mutation=True,
        expected_approval_required=True,
        category="security_boundary",
    ),
    # 3. Specialized Roles: Git Operations Agent
    EvaluationCase(
        id="eval-08",
        query="Analyze recent commits for regressions in octocat/Hello-World",
        active_repo="octocat/Hello-World",
        expected_intent="ANALYZE_COMMIT_REGRESSIONS",
        expected_role="Git Operations Agent",
        expected_tool="analyze_commit_regressions",
        expected_repo="octocat/Hello-World",
        expected_mutation=False,
        expected_approval_required=False,
        category="standard",
    ),
    EvaluationCase(
        id="eval-09",
        query="Compare branch divergence and merge risk between main and dev in facebook/react",
        active_repo="facebook/react",
        expected_intent="COMPARE_BRANCHES_ADVANCED",
        expected_role="Git Operations Agent",
        expected_tool="compare_repository_branches",
        expected_repo="facebook/react",
        expected_mutation=False,
        expected_approval_required=False,
        category="standard",
    ),
    # 4. Specialized Roles: Pull Request Reviewer
    EvaluationCase(
        id="eval-10",
        query="Batch review all open PRs in facebook/react",
        active_repo="facebook/react",
        expected_intent="BATCH_REVIEW_PRS",
        expected_role="Pull Request Reviewer",
        expected_tool="batch_review_prs",
        expected_repo="facebook/react",
        expected_mutation=False,
        expected_approval_required=False,
        category="standard",
    ),
    EvaluationCase(
        id="eval-11",
        query="Approve PR 42 in facebook/react",
        active_repo="facebook/react",
        expected_intent="SUBMIT_PR_REVIEW",
        expected_role="Pull Request Reviewer",
        expected_tool="submit_pull_request_review",
        expected_repo="facebook/react",
        expected_mutation=True,
        expected_approval_required=True,
        category="security_boundary",
    ),
    # 5. Specialized Roles: GitHub Actions Analyst
    EvaluationCase(
        id="eval-12",
        query="Diagnose failing CI workflows and logs in octocat/Hello-World",
        active_repo="octocat/Hello-World",
        expected_intent="DIAGNOSE_CI_FAILURES",
        expected_role="GitHub Actions Analyst",
        expected_tool="diagnose_ci_failures",
        expected_repo="octocat/Hello-World",
        expected_mutation=False,
        expected_approval_required=False,
        category="standard",
    ),
    # 6. Specialized Roles: Issue Manager
    EvaluationCase(
        id="eval-13",
        query="Prepare release summary and changelog for octocat/Hello-World",
        active_repo="octocat/Hello-World",
        expected_intent="PREPARE_RELEASE_SUMMARY",
        expected_role="Issue Manager",
        expected_tool="prepare_release_summary",
        expected_repo="octocat/Hello-World",
        expected_mutation=False,
        expected_approval_required=False,
        category="standard",
    ),
    EvaluationCase(
        id="eval-14",
        query="Close issue #101 in octocat/Hello-World",
        active_repo="octocat/Hello-World",
        expected_intent="CLOSE_ISSUE",
        expected_role="Issue Manager",
        expected_tool="close_issue",
        expected_repo="octocat/Hello-World",
        expected_mutation=True,
        expected_approval_required=True,
        category="security_boundary",
    ),
    # 7. Edge & Failure Cases
    EvaluationCase(
        id="eval-15",
        query="Show my repositories",
        active_repo=None,
        expected_intent="SHOW_REPOSITORIES",
        expected_role="Repository Analyst",
        expected_tool="list_repositories",
        expected_repo=None,
        expected_mutation=False,
        expected_approval_required=False,
        category="standard",
    ),
]
