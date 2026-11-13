"""Sandboxed Local Git Workspace Manager using GitPython."""

from pathlib import Path
from typing import Any

import git

from app.core.config import get_settings


class GitSecurityException(Exception):
    """Raised when an operation violates workspace path containment or security rules."""

    pass


class LocalGitManager:
    """Manages local repository clones and Git operations safely within workspace sandbox."""

    def __init__(self, workspace_root: str | None = None):
        settings = get_settings()
        self.workspace_root = Path(workspace_root or settings.WORKSPACE_DIR).resolve()
        self.workspace_root.mkdir(parents=True, exist_ok=True)

    def _resolve_repo_path(self, owner: str, repo: str) -> Path:
        """Resolve repository path and strictly verify no path traversal."""
        # Sanitize components
        safe_owner = Path(owner).name
        safe_repo = Path(repo).name
        target_path = (self.workspace_root / safe_owner / safe_repo).resolve()

        # Strict containment check
        if not str(target_path).startswith(str(self.workspace_root)):
            raise GitSecurityException("Path traversal attempt detected. Operation denied.")

        return target_path

    def _validate_file_path(self, repo_dir: Path, relative_file_path: str) -> Path:
        """Verify file path is strictly within repository directory."""
        target_file = (repo_dir / relative_file_path).resolve()
        if not str(target_file).startswith(str(repo_dir)):
            raise GitSecurityException(
                f"Target file '{relative_file_path}' attempts path traversal."
            )
        return target_file

    def get_repo_status(self, owner: str, repo: str) -> dict[str, Any]:
        """Get current git status, active branch, and untracked/modified files."""
        repo_dir = self._resolve_repo_path(owner, repo)
        if not (repo_dir / ".git").exists():
            return {"is_cloned": False, "path": str(repo_dir)}

        repository = git.Repo(repo_dir)
        active_branch = (
            repository.active_branch.name if not repository.head.is_detached else "DETACHED"
        )
        modified_files = [item.a_path for item in repository.index.diff(None)]
        untracked_files = repository.untracked_files

        return {
            "is_cloned": True,
            "path": str(repo_dir),
            "active_branch": active_branch,
            "is_dirty": repository.is_dirty(),
            "modified_files": modified_files,
            "untracked_files": untracked_files,
        }

    def init_or_clone_repo(
        self, owner: str, repo: str, clone_url: str | None = None
    ) -> dict[str, Any]:
        """Initialize local repository directory or clone from remote."""
        repo_dir = self._resolve_repo_path(owner, repo)
        if (repo_dir / ".git").exists():
            return {"status": "already_exists", "path": str(repo_dir)}

        repo_dir.mkdir(parents=True, exist_ok=True)
        if clone_url:
            repository = git.Repo.clone_from(clone_url, repo_dir)
            active_branch = repository.active_branch.name
        else:
            # Initialize empty repo with default branch
            repository = git.Repo.init(repo_dir)
            active_branch = "main"

        return {
            "status": "initialized",
            "path": str(repo_dir),
            "active_branch": active_branch,
        }

    def create_branch(self, owner: str, repo: str, branch_name: str) -> dict[str, Any]:
        """Create and checkout a new git branch."""
        repo_dir = self._resolve_repo_path(owner, repo)
        repository = git.Repo(repo_dir)
        new_branch = repository.create_head(branch_name)
        new_branch.checkout()
        return {"status": "created", "branch": branch_name}

    def write_file(self, owner: str, repo: str, file_path: str, content: str) -> dict[str, Any]:
        """Write content to a file in the repository safely."""
        repo_dir = self._resolve_repo_path(owner, repo)
        target_file = self._validate_file_path(repo_dir, file_path)
        target_file.parent.mkdir(parents=True, exist_ok=True)
        target_file.write_text(content, encoding="utf-8")
        return {"status": "written", "file": file_path, "bytes": len(content)}

    def get_diff(self, owner: str, repo: str) -> str:
        """Get unified diff of unstaged and staged changes."""
        repo_dir = self._resolve_repo_path(owner, repo)
        repository = git.Repo(repo_dir)
        # Compare index to working directory
        diff_text = repository.git.diff()
        return diff_text

    def commit(
        self, owner: str, repo: str, message: str, author_name: str = "GitHub AI Agent"
    ) -> dict[str, Any]:
        """Stage all modified/untracked files and create a commit."""
        repo_dir = self._resolve_repo_path(owner, repo)
        repository = git.Repo(repo_dir)
        repository.git.add(A=True)
        commit_obj = repository.index.commit(
            message,
            author=git.Actor(author_name, "agent@github-ai-workspace.local"),
        )
        return {
            "status": "committed",
            "commit_hash": commit_obj.hexsha,
            "message": message,
        }
