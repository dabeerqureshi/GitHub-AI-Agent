"""Unit tests for the 12 Advanced GitHub AI Workflows."""

import pytest

from app.agent.tools.git_local import LocalGitManager
from app.services.advanced_workflows import AdvancedWorkflowsService
from app.services.repo_intelligence import RepoIntelligenceService
from app.services.workspace_manager import CodingWorkspaceManager
from tests.fixtures.sample_repo import create_sample_repository


@pytest.fixture
def service_with_sample_repo(tmp_path):
    repo_dir, repo = create_sample_repository(tmp_path, owner="octocat", repo_name="Hello-World")
    git_manager = LocalGitManager(workspace_root=str(tmp_path))
    intelligence = RepoIntelligenceService(git_manager=git_manager)
    workspace_manager = CodingWorkspaceManager(
        git_manager=git_manager, isolated_root=str(tmp_path / "workspaces")
    )
    return AdvancedWorkflowsService(
        repo_intelligence=intelligence,
        workspace_manager=workspace_manager,
        git_manager=git_manager,
    )


def test_analyze_entire_repository(service_with_sample_repo):
    service = service_with_sample_repo
    res = service.analyze_entire_repository("octocat", "Hello-World")
    assert res["repository"] == "octocat/Hello-World"
    assert "Python" in res["languages"] or len(res["languages"]) > 0
    assert res["total_files"] > 0
    assert "Architecture Summary" in res["architecture_summary"]


def test_identify_technical_debt(service_with_sample_repo):
    service = service_with_sample_repo
    res = service.identify_technical_debt("octocat", "Hello-World")
    assert res["repository"] == "octocat/Hello-World"
    assert "overall_health_score" in res
    assert isinstance(res["debt_items"], list)


def test_find_code_duplication(service_with_sample_repo):
    service = service_with_sample_repo
    res = service.find_code_duplication("octocat", "Hello-World")
    assert res["repository"] == "octocat/Hello-World"
    assert "duplicated_symbol_count" in res
    assert isinstance(res["duplicated_symbols"], list)


def test_investigate_production_bug(service_with_sample_repo):
    service = service_with_sample_repo
    res = service.investigate_production_bug(
        "octocat", "Hello-World", "NullPointerException when dividing in calculator"
    )
    assert res["repository"] == "octocat/Hello-World"
    assert "hypothesis" in res
    assert "next_action" in res


def test_analyze_commit_regressions(service_with_sample_repo):
    service = service_with_sample_repo
    res = service.analyze_commit_regressions("octocat", "Hello-World", limit=5)
    assert res["repository"] == "octocat/Hello-World"
    assert res["analyzed_commits"] > 0
    assert isinstance(res["commits"], list)


def test_compare_branches_advanced(service_with_sample_repo):
    service = service_with_sample_repo
    res = service.compare_branches_advanced("octocat", "Hello-World", base="main", head="dev")
    assert res["repository"] == "octocat/Hello-World"
    assert "merge_risk" in res
    assert "total_files_changed" in res


@pytest.mark.asyncio
async def test_batch_review_prs(service_with_sample_repo):
    service = service_with_sample_repo
    res = await service.batch_review_prs("octocat", "Hello-World")
    assert res["repository"] == "octocat/Hello-World"
    assert "total_open_prs" in res
    assert isinstance(res["reviews"], list)


@pytest.mark.asyncio
async def test_diagnose_ci_failures(service_with_sample_repo):
    service = service_with_sample_repo
    res = await service.diagnose_ci_failures("octocat", "Hello-World")
    assert res["repository"] == "octocat/Hello-World"
    assert "diagnostics" in res
    assert "top_recommendation" in res


def test_generate_development_plan(service_with_sample_repo):
    service = service_with_sample_repo
    res = service.generate_development_plan(
        "octocat", "Hello-World", "Add Redis caching for API responses"
    )
    assert res["repository"] == "octocat/Hello-World"
    assert res["feature_goal"] == "Add Redis caching for API responses"
    assert res["total_phases"] == 4
    assert len(res["phases"]) == 4


@pytest.mark.asyncio
async def test_implement_multi_file_feature(service_with_sample_repo):
    service = service_with_sample_repo
    res = await service.implement_multi_file_feature(
        owner="octocat",
        repo="Hello-World",
        feature_name="user-auth",
        file_edits={
            "src/auth.py": '"""Auth module."""\ndef login(): return True\n',
            "tests/test_auth.py": "import pytest\nfrom src.auth import login\ndef test_login(): assert login() is True\n",
        },
        branch_name="feature-auth-test",
    )
    assert res["repository"] == "octocat/Hello-World"
    assert len(res["files_modified"]) == 2
    assert res["is_verified"] is True
    assert res["status"] == "READY_FOR_APPROVAL"
    assert "auth.py" in res["diff"]


def test_generate_tests_for_code(service_with_sample_repo):
    service = service_with_sample_repo
    res = service.generate_tests_for_code("octocat", "Hello-World", "src/calculator.py")
    assert res["repository"] == "octocat/Hello-World"
    assert "test_calculator.py" in res["generated_test_path"]
    assert "def test_module_initialization():" in res["generated_test_code"]


@pytest.mark.asyncio
async def test_prepare_release_summary(service_with_sample_repo):
    service = service_with_sample_repo
    res = await service.prepare_release_summary("octocat", "Hello-World")
    assert res["repository"] == "octocat/Hello-World"
    assert "Release Summary" in res["changelog"]
    assert "Features" in res["changelog"]
    assert "Bug Fixes" in res["changelog"]
