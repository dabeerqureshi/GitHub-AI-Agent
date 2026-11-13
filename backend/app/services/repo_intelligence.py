"""Repository Intelligence Service for deep code, dependency, and commit analysis."""

import ast
import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import git
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.tools.git_local import LocalGitManager
from app.models.repo_context import RepoContextSnapshot
from app.schemas.intelligence import (
    ArchitectureSummary,
    BranchComparison,
    FileBrowseItem,
    FileContentWithLines,
    SearchResultItem,
)
from app.services.search_index import BaseSearchIndexer, LocalSymbolSearchIndexer


class RepoIntelligenceService:
    """Service providing repository structure, source code, dependency, and commit intelligence."""

    def __init__(
        self,
        git_manager: LocalGitManager | None = None,
        search_indexer: BaseSearchIndexer | None = None,
    ):
        self.git_manager = git_manager or LocalGitManager()
        self.search_indexer = search_indexer or LocalSymbolSearchIndexer()

    def _resolve_repo(self, owner: str, repo: str) -> git.Repo:
        """Resolve and open git repository."""
        path = self.git_manager._resolve_repo_path(owner, repo)
        if not (path / ".git").exists():
            raise FileNotFoundError(f"Repository {owner}/{repo} is not initialized or cloned.")
        return git.Repo(path)

    def get_latest_commit_sha(self, owner: str, repo: str, branch: str | None = None) -> str | None:
        """Retrieve current HEAD commit SHA."""
        try:
            repository = self._resolve_repo(owner, repo)
            if branch:
                commit = repository.commit(branch)
            else:
                commit = repository.head.commit
            return commit.hexsha
        except Exception:
            return None

    def browse_files(self, owner: str, repo: str, relative_path: str = "") -> list[FileBrowseItem]:
        """Browse files and directories at given relative path in repository."""
        repo_dir = self.git_manager._resolve_repo_path(owner, repo)
        target_dir = self.git_manager._validate_file_path(repo_dir, relative_path)

        if not target_dir.exists() or not target_dir.is_dir():
            return []

        items: list[FileBrowseItem] = []
        for entry in sorted(target_dir.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
            # Skip hidden git internal directory
            if entry.name == ".git":
                continue

            rel = str(entry.relative_to(repo_dir))
            is_dir = entry.is_dir()
            size = entry.stat().st_size if not is_dir else 0
            items.append(
                FileBrowseItem(
                    name=entry.name,
                    path=rel,
                    type="directory" if is_dir else "file",
                    size=size,
                    extension=entry.suffix.lstrip(".") if not is_dir else "",
                )
            )

        return items

    def get_file_content_with_lines(
        self,
        owner: str,
        repo: str,
        relative_path: str,
        start_line: int | None = None,
        end_line: int | None = None,
    ) -> FileContentWithLines:
        """Retrieve file content formatted with line numbers and citations."""
        repo_dir = self.git_manager._resolve_repo_path(owner, repo)
        file_path = self.git_manager._validate_file_path(repo_dir, relative_path)

        if not file_path.exists() or file_path.is_dir():
            raise FileNotFoundError(f"File '{relative_path}' not found in repository.")

        raw_content = file_path.read_text(encoding="utf-8", errors="replace")
        lines = raw_content.splitlines()
        total_lines = len(lines)

        s_line = max(1, start_line or 1)
        e_line = min(total_lines, end_line or total_lines)
        if s_line > e_line:
            s_line = e_line

        selected_lines = lines[s_line - 1 : e_line]
        formatted = "\n".join(
            f"{s_line + idx:4d} | {line}" for idx, line in enumerate(selected_lines)
        )
        citation = f"[{relative_path}#L{s_line}-L{e_line}]"

        return FileContentWithLines(
            path=relative_path,
            total_lines=total_lines,
            start_line=s_line,
            end_line=e_line,
            content=formatted,
            citation=citation,
        )

    def extract_python_symbols(self, code: str, file_path: str) -> list[dict[str, Any]]:
        """Extract classes, functions, and docstrings from Python source via AST."""
        symbols: list[dict[str, Any]] = []
        try:
            tree = ast.parse(code)
            for node in ast.iter_child_nodes(tree):
                if isinstance(node, ast.ClassDef):
                    methods = [n.name for n in node.body if isinstance(n, ast.FunctionDef)]
                    symbols.append(
                        {
                            "type": "class",
                            "name": node.name,
                            "line": node.lineno,
                            "methods": methods,
                            "docstring": ast.get_docstring(node),
                            "citation": f"[{file_path}#L{node.lineno}]",
                        }
                    )
                elif isinstance(node, ast.FunctionDef):
                    symbols.append(
                        {
                            "type": "function",
                            "name": node.name,
                            "line": node.lineno,
                            "args": [a.arg for a in node.args.args],
                            "docstring": ast.get_docstring(node),
                            "citation": f"[{file_path}#L{node.lineno}]",
                        }
                    )
        except SyntaxError:
            pass
        return symbols

    def extract_typescript_symbols(self, code: str, file_path: str) -> list[dict[str, Any]]:
        """Extract exported interfaces, classes, and functions from TypeScript/JavaScript."""
        symbols: list[dict[str, Any]] = []
        lines = code.splitlines()
        interface_pat = re.compile(r"export\s+interface\s+([A-Za-z0-9_]+)")
        class_pat = re.compile(r"export\s+class\s+([A-Za-z0-9_]+)")
        func_pat = re.compile(r"export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)")
        const_pat = re.compile(r"export\s+const\s+([A-Za-z0-9_]+)")

        for idx, line in enumerate(lines, start=1):
            if m := interface_pat.search(line):
                symbols.append(
                    {
                        "type": "interface",
                        "name": m.group(1),
                        "line": idx,
                        "citation": f"[{file_path}#L{idx}]",
                    }
                )
            elif m := class_pat.search(line):
                symbols.append(
                    {
                        "type": "class",
                        "name": m.group(1),
                        "line": idx,
                        "citation": f"[{file_path}#L{idx}]",
                    }
                )
            elif m := func_pat.search(line):
                symbols.append(
                    {
                        "type": "function",
                        "name": m.group(1),
                        "line": idx,
                        "citation": f"[{file_path}#L{idx}]",
                    }
                )
            elif m := const_pat.search(line):
                symbols.append(
                    {
                        "type": "const",
                        "name": m.group(1),
                        "line": idx,
                        "citation": f"[{file_path}#L{idx}]",
                    }
                )

        return symbols

    def extract_dependencies(self, repo_dir: Path) -> dict[str, list[str]]:
        """Extract project dependencies from standard manifest files."""
        deps: dict[str, list[str]] = {"python": [], "node": []}

        # Python requirements.txt
        req_file = repo_dir / "requirements.txt"
        if req_file.exists():
            for line in req_file.read_text(encoding="utf-8").splitlines():
                clean = line.strip()
                if clean and not clean.startswith("#"):
                    deps["python"].append(clean)

        # Node package.json
        pkg_file = repo_dir / "package.json"
        if pkg_file.exists():
            try:
                data = json.loads(pkg_file.read_text(encoding="utf-8"))
                for dep, ver in data.get("dependencies", {}).items():
                    deps["node"].append(f"{dep}@{ver}")
            except Exception:
                pass

        return deps

    def search_code(
        self, owner: str, repo: str, query: str, limit: int = 50
    ) -> list[SearchResultItem]:
        """Search repository code returning matching lines and citations."""
        full_name = f"{owner}/{repo}"
        repo_dir = self.git_manager._resolve_repo_path(owner, repo)
        if not (repo_dir / ".git").exists():
            raise FileNotFoundError(f"Repository {owner}/{repo} is not initialized or cloned.")

        # Ensure files are indexed in the search indexer
        if not getattr(self.search_indexer, "_index", {}).get(full_name):
            all_files = [f for f in repo_dir.glob("**/*") if f.is_file() and ".git" not in f.parts]
            file_map: dict[str, str] = {}
            for f in all_files:
                try:
                    rel = str(f.relative_to(repo_dir))
                    file_map[rel] = f.read_text(encoding="utf-8", errors="replace")
                except Exception:
                    pass
            self.search_indexer.index_repository_files(full_name, file_map)

        return self.search_indexer.search(full_name, query, limit)

    def compare_branches(
        self, owner: str, repo: str, base: str = "main", head: str | None = None
    ) -> BranchComparison:
        """Compare commits and changed files between base and head branches."""
        repository = self._resolve_repo(owner, repo)
        head_branch = head or repository.active_branch.name

        base_commit = repository.commit(base)
        head_commit = repository.commit(head_branch)

        # Commits list from base to head
        commits_ahead = list(repository.iter_commits(f"{base}..{head_branch}"))
        commits_behind = list(repository.iter_commits(f"{head_branch}..{base}"))

        diff_index = base_commit.diff(head_commit)
        changed_files = [item.a_path or item.b_path for item in diff_index]

        diff_stat = f"+{len(commits_ahead)} commits ahead, -{len(commits_behind)} commits behind"

        return BranchComparison(
            base_branch=base,
            head_branch=head_branch,
            ahead_by=len(commits_ahead),
            behind_by=len(commits_behind),
            commits=[
                {
                    "sha": c.hexsha[:8],
                    "message": c.message.strip(),
                    "author": c.author.name,
                    "date": c.committed_datetime.isoformat(),
                }
                for c in commits_ahead
            ],
            changed_files=changed_files,
            diff_stat=diff_stat,
        )

    def generate_architecture_summary(self, owner: str, repo: str) -> ArchitectureSummary:
        """Synthesize a structured architecture summary with verified facts, reasonable inferences, and unknown information."""
        repo_dir = self.git_manager._resolve_repo_path(owner, repo)
        repository = self._resolve_repo(owner, repo)
        commit_sha = repository.head.commit.hexsha[:8]

        verified_facts: list[str] = []
        reasonable_inferences: list[str] = []
        unknown_information: list[str] = []
        detected_frameworks: list[str] = []
        primary_languages: list[str] = []

        # 1. Structure inspection
        has_python = any(repo_dir.glob("**/*.py"))
        has_ts = any(repo_dir.glob("**/*.ts")) or any(repo_dir.glob("**/*.tsx"))
        has_docker = (repo_dir / "Dockerfile").exists() or (
            repo_dir / "docker-compose.yml"
        ).exists()
        has_tests = (
            (repo_dir / "tests").exists()
            or any(repo_dir.glob("**/test_*.py"))
            or any(repo_dir.glob("**/*.test.ts"))
        )

        if has_python:
            primary_languages.append("Python")
            verified_facts.append(
                f"Repository contains Python source files ({len(list(repo_dir.glob('**/*.py')))} files)."
            )
        if has_ts:
            primary_languages.append("TypeScript")
            verified_facts.append(
                f"Repository contains TypeScript/React source files ({len(list(repo_dir.glob('**/*.ts')))} files)."
            )

        # 2. Framework detection
        deps = self.extract_dependencies(repo_dir)
        for dep in deps.get("python", []):
            if "fastapi" in dep.lower():
                detected_frameworks.append("FastAPI")
                verified_facts.append(
                    "FastAPI framework used for backend API layer (found in dependencies)."
                )
            elif "langgraph" in dep.lower():
                detected_frameworks.append("LangGraph")
                verified_facts.append("LangGraph used for stateful workflow orchestration.")
            elif "sqlalchemy" in dep.lower():
                detected_frameworks.append("SQLAlchemy")
                verified_facts.append("SQLAlchemy used as ORM persistence engine.")

        for dep in deps.get("node", []):
            if "next" in dep.lower():
                detected_frameworks.append("Next.js")
                verified_facts.append("Next.js App Router used for frontend web UI.")
            elif "tailwind" in dep.lower():
                detected_frameworks.append("Tailwind CSS")
                verified_facts.append("Tailwind CSS configured for user interface styling.")

        if has_docker:
            verified_facts.append(
                "Containerized deployment support verified via Dockerfile / Docker Compose."
            )

        # 3. Reasonable Inferences
        if has_python and has_ts:
            reasonable_inferences.append(
                "Architecture is organized as a decoupled monorepo with distinct frontend and backend boundaries."
            )
        if has_tests:
            reasonable_inferences.append(
                "Project adheres to automated test-driven development practices with unit/integration suites."
            )
        else:
            reasonable_inferences.append(
                "Automated test coverage may be incomplete or located in external fixtures."
            )

        # 4. Unknown Information
        unknown_information.append(
            "Production cloud hosting provider (AWS, GCP, Azure) is not specified in repository configuration."
        )
        unknown_information.append(
            "Production continuous deployment pipeline (CD) triggers and production secrets are managed outside the repository."
        )

        markdown_report = (
            f"## Architecture Summary: `{owner}/{repo}` (commit: `{commit_sha}`)\n\n"
            f"**Languages:** {', '.join(primary_languages) or 'Unknown'}\n"
            f"**Frameworks:** {', '.join(detected_frameworks) or 'None detected'}\n\n"
            f"### Verified Facts (Code & Commit Grounded)\n"
            + "\n".join(f"- {f}" for f in verified_facts)
            + "\n\n### Reasonable Inferences (Design & Architecture)\n"
            + "\n".join(f"- {i}" for i in reasonable_inferences)
            + "\n\n### Unknown Information (Not Evident in Repository)\n"
            + "\n".join(f"- {u}" for u in unknown_information)
        )

        return ArchitectureSummary(
            full_name=f"{owner}/{repo}",
            commit_sha=commit_sha,
            primary_languages=primary_languages,
            frameworks_detected=detected_frameworks,
            verified_facts=verified_facts,
            reasonable_inferences=reasonable_inferences,
            unknown_information=unknown_information,
            markdown_report=markdown_report,
        )

    async def get_or_refresh_context(
        self,
        owner: str,
        repo: str,
        db: AsyncSession,
        force_refresh: bool = False,
    ) -> RepoContextSnapshot:
        """
        Incremental context refresh based on latest commit SHA.

        Avoids downloading or re-indexing if commit SHA is unchanged.
        """
        full_name = f"{owner}/{repo}"
        latest_sha = self.get_latest_commit_sha(owner, repo)

        result = await db.execute(
            select(RepoContextSnapshot).where(RepoContextSnapshot.full_name == full_name)
        )
        snapshot = result.scalar_one_or_none()

        # Cache hit: commit SHA has not changed and force_refresh is False
        if snapshot and snapshot.last_indexed_commit_sha == latest_sha and not force_refresh:
            return snapshot

        # Incremental Refresh
        repo_dir = self.git_manager._resolve_repo_path(owner, repo)
        repository = self._resolve_repo(owner, repo)
        default_branch = (
            repository.active_branch.name if not repository.head.is_detached else "main"
        )

        # Discover tree, docs, configs
        all_files = [f for f in repo_dir.glob("**/*") if f.is_file() and ".git" not in f.parts]
        file_map: dict[str, str] = {}
        symbols: dict[str, Any] = {}
        languages = set()

        for f in all_files:
            rel = str(f.relative_to(repo_dir))
            ext = f.suffix.lower()
            if ext == ".py":
                languages.add("Python")
                content = f.read_text(encoding="utf-8", errors="replace")
                file_map[rel] = content
                symbols[rel] = self.extract_python_symbols(content, rel)
            elif ext in (".ts", ".tsx", ".js", ".jsx"):
                languages.add("TypeScript/JavaScript")
                content = f.read_text(encoding="utf-8", errors="replace")
                file_map[rel] = content
                symbols[rel] = self.extract_typescript_symbols(content, rel)
            elif ext in (".md", ".txt"):
                content = f.read_text(encoding="utf-8", errors="replace")
                file_map[rel] = content

        # Index files in pluggable search layer
        self.search_indexer.index_repository_files(full_name, file_map)

        # Documentation and config manifests
        doc_files = [
            {"path": str(f.relative_to(repo_dir)), "size": f.stat().st_size}
            for f in all_files
            if f.name.lower() in ("readme.md", "architecture.md", "contributing.md", "license")
        ]
        config_files = [
            {"path": str(f.relative_to(repo_dir)), "size": f.stat().st_size}
            for f in all_files
            if f.name.lower()
            in (
                "pyproject.toml",
                "package.json",
                "dockerfile",
                "docker-compose.yml",
                "tsconfig.json",
            )
        ]
        deps = self.extract_dependencies(repo_dir)
        summary = self.generate_architecture_summary(owner, repo).markdown_report

        if not snapshot:
            snapshot = RepoContextSnapshot(
                full_name=full_name,
                default_branch=default_branch,
                last_indexed_commit_sha=latest_sha,
                languages=sorted(languages),
                directory_tree={"total_files": len(all_files)},
                documentation_files=doc_files,
                configuration_files=config_files,
                dependencies=deps,
                symbols=symbols,
                architecture_summary=summary,
                last_refreshed_at=datetime.now(UTC),
            )
            db.add(snapshot)
        else:
            snapshot.last_indexed_commit_sha = latest_sha
            snapshot.languages = sorted(languages)
            snapshot.directory_tree = {"total_files": len(all_files)}
            snapshot.documentation_files = doc_files
            snapshot.configuration_files = config_files
            snapshot.dependencies = deps
            snapshot.symbols = symbols
            snapshot.architecture_summary = summary
            snapshot.last_refreshed_at = datetime.now(UTC)

        await db.commit()
        await db.refresh(snapshot)
        return snapshot
