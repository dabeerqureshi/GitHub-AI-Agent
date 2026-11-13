"""Unit tests for Phase 4 Repository Intelligence subsystem."""

from pathlib import Path

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.tools.git_local import LocalGitManager
from app.services.repo_intelligence import RepoIntelligenceService
from tests.fixtures.sample_repo import create_sample_repository


@pytest.fixture
def sample_repo(tmp_path: Path):
    """Fixture initializing a rich git repository in a temporary workspace."""
    repo_dir, git_repo = create_sample_repository(
        tmp_path, owner="testorg", repo_name="sample-repo"
    )
    git_manager = LocalGitManager(workspace_root=str(tmp_path))
    intelligence_service = RepoIntelligenceService(git_manager=git_manager)
    return {
        "repo_dir": repo_dir,
        "git_repo": git_repo,
        "git_manager": git_manager,
        "service": intelligence_service,
        "owner": "testorg",
        "repo": "sample-repo",
    }


def test_browse_files_root_and_subdirectories(sample_repo):
    """Verify repository structure inspection and browsing at root and subdirectories."""
    service = sample_repo["service"]
    owner = sample_repo["owner"]
    repo = sample_repo["repo"]

    # Browse root
    root_items = service.browse_files(owner, repo, relative_path="")
    names = [i.name for i in root_items]
    assert "README.md" in names
    assert "package.json" in names
    assert "src" in names
    assert ".git" not in names

    # Browse src directory
    src_items = service.browse_files(owner, repo, relative_path="src")
    src_names = [i.name for i in src_items]
    assert "calculator.py" in src_names
    assert "index.ts" in src_names


def test_get_file_content_with_lines_and_citations(sample_repo):
    """Verify file content retrieval with line formatting and exact citation ranges."""
    service = sample_repo["service"]
    owner = sample_repo["owner"]
    repo = sample_repo["repo"]

    # Read specific line window from calculator.py
    file_info = service.get_file_content_with_lines(
        owner, repo, "src/calculator.py", start_line=3, end_line=8
    )

    assert file_info.path == "src/calculator.py"
    assert file_info.start_line == 3
    assert file_info.end_line == 8
    assert file_info.citation == "[src/calculator.py#L3-L8]"
    assert "class Calculator:" in file_info.content
    assert "3 | class Calculator:" in file_info.content


def test_python_symbol_extraction_via_ast(sample_repo):
    """Verify AST-based symbol parsing for classes, methods, functions, and docstrings."""
    service = sample_repo["service"]
    code = (
        "class MathEngine:\n"
        '    """Core math engine."""\n'
        "    def compute(self, x: int) -> int:\n"
        "        return x * 2\n\n"
        "def standalone_helper():\n"
        '    """Helper doc."""\n'
        "    pass\n"
    )
    symbols = service.extract_python_symbols(code, "engine.py")

    assert len(symbols) == 2
    class_sym = next(s for s in symbols if s["type"] == "class")
    assert class_sym["name"] == "MathEngine"
    assert "compute" in class_sym["methods"]
    assert class_sym["docstring"] == "Core math engine."
    assert class_sym["citation"] == "[engine.py#L1]"

    fn_sym = next(s for s in symbols if s["type"] == "function")
    assert fn_sym["name"] == "standalone_helper"
    assert fn_sym["docstring"] == "Helper doc."
    assert fn_sym["citation"] == "[engine.py#L6]"


def test_typescript_symbol_extraction(sample_repo):
    """Verify TypeScript regex parsing for interfaces, classes, and functions."""
    service = sample_repo["service"]
    code = (
        "export interface UserProfile {\n"
        "  id: string;\n"
        "}\n\n"
        "export class UserManager {\n"
        "  save() {}\n"
        "}\n\n"
        "export function fetchUser() {}\n"
        "export const MAX_RETRY = 3;\n"
    )
    symbols = service.extract_typescript_symbols(code, "user.ts")
    types = {s["type"]: s["name"] for s in symbols}

    assert types["interface"] == "UserProfile"
    assert types["class"] == "UserManager"
    assert types["function"] == "fetchUser"
    assert types["const"] == "MAX_RETRY"


def test_dependency_extraction(sample_repo):
    """Verify parsing manifest dependencies from requirements.txt and package.json."""
    service = sample_repo["service"]
    repo_dir = sample_repo["repo_dir"]

    deps = service.extract_dependencies(repo_dir)

    assert any("fastapi" in d for d in deps["python"])
    assert any("pytest" in d for d in deps["python"])
    assert any("express" in d for d in deps["node"])
    assert any("zod" in d for d in deps["node"])


def test_branch_comparison(sample_repo):
    """Verify branch diff comparison between main and feature branch."""
    service = sample_repo["service"]
    owner = sample_repo["owner"]
    repo = sample_repo["repo"]

    # Compare feature-auth against base main
    comparison = service.compare_branches(owner, repo, base="main", head="feature-auth")

    assert comparison.base_branch == "main"
    assert comparison.head_branch == "feature-auth"
    assert comparison.ahead_by == 1
    assert comparison.behind_by == 0
    assert "src/auth.py" in comparison.changed_files
    assert len(comparison.commits) == 1
    assert "feat(auth)" in comparison.commits[0]["message"]


def test_code_search_indexer_and_service(sample_repo):
    """Verify code search returning accurate lines and citations."""
    service = sample_repo["service"]
    owner = sample_repo["owner"]
    repo = sample_repo["repo"]

    results = service.search_code(owner, repo, query="Calculator")
    assert len(results) >= 1
    calc_match = next((m for m in results if "calculator.py" in m.path), None)
    assert calc_match is not None
    assert calc_match.citation == f"[{calc_match.path}#L{calc_match.line_number}]"
    assert "Calculator" in calc_match.line_content


def test_architecture_summary_three_sections(sample_repo):
    """Verify architecture summary strictly categorizes facts, inferences, and unknown information."""
    service = sample_repo["service"]
    owner = sample_repo["owner"]
    repo = sample_repo["repo"]

    summary = service.generate_architecture_summary(owner, repo)

    assert "Python" in summary.primary_languages
    assert "TypeScript" in summary.primary_languages
    assert "FastAPI" in summary.frameworks_detected

    # 1. Verified facts
    assert len(summary.verified_facts) > 0
    assert any("Python" in f for f in summary.verified_facts)
    assert any("FastAPI" in f for f in summary.verified_facts)

    # 2. Reasonable inferences
    assert len(summary.reasonable_inferences) > 0
    assert any("monorepo" in i.lower() for i in summary.reasonable_inferences)

    # 3. Unknown information
    assert len(summary.unknown_information) > 0
    assert any("hosting" in u.lower() or "cloud" in u.lower() for u in summary.unknown_information)

    # Markdown format check
    assert "### Verified Facts" in summary.markdown_report
    assert "### Reasonable Inferences" in summary.markdown_report
    assert "### Unknown Information" in summary.markdown_report


@pytest.mark.asyncio
async def test_incremental_context_caching(sample_repo, in_memory_db: AsyncSession):
    """Verify incremental context snapshot caching avoiding re-indexing when commit SHA is unchanged."""
    service = sample_repo["service"]
    owner = sample_repo["owner"]
    repo = sample_repo["repo"]

    # 1. First run: Generates and saves snapshot
    snapshot1 = await service.get_or_refresh_context(owner, repo, in_memory_db)
    assert snapshot1.full_name == f"{owner}/{repo}"
    assert snapshot1.last_indexed_commit_sha is not None
    last_time = snapshot1.last_refreshed_at

    # 2. Second run: Hit cache without re-indexing
    snapshot2 = await service.get_or_refresh_context(owner, repo, in_memory_db)
    assert snapshot2.id == snapshot1.id
    assert snapshot2.last_refreshed_at == last_time

    # 3. Force refresh: Re-indexes
    snapshot3 = await service.get_or_refresh_context(owner, repo, in_memory_db, force_refresh=True)
    assert snapshot3.id == snapshot1.id
