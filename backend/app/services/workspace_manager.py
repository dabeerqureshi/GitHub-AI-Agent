"""Isolated Git Worktree and Workspace Manager for Autonomous Coding Agent."""

import shutil
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import git
from pydantic import BaseModel, Field

from app.agent.tools.git_local import GitSecurityException, LocalGitManager
from app.core.config import get_settings


class DiskQuotaExceededException(Exception):
    """Raised when workspace disk usage exceeds the allocated limit."""

    pass


class IsolatedWorkspace(BaseModel):
    """Metadata tracking an isolated coding workspace."""

    workspace_id: str = Field(default_factory=lambda: f"ws-{uuid.uuid4().hex[:10]}")
    owner: str
    repo: str
    branch_name: str
    base_branch: str = "main"
    worktree_path: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    disk_limit_bytes: int = 200 * 1024 * 1024  # 200 MB default quota


class CodingWorkspaceManager:
    """Manages isolated git worktrees, preventing changes to the main repository."""

    def __init__(
        self,
        git_manager: LocalGitManager | None = None,
        isolated_root: str | None = None,
        default_disk_limit_bytes: int = 200 * 1024 * 1024,
    ):
        self.git_manager = git_manager or LocalGitManager()
        settings = get_settings()
        base = isolated_root or f"{settings.WORKSPACE_DIR}/isolated_worktrees"
        self.isolated_root = Path(base).resolve()
        self.isolated_root.mkdir(parents=True, exist_ok=True)
        self.default_disk_limit = default_disk_limit_bytes
        self._active_workspaces: dict[str, IsolatedWorkspace] = {}

    def _calculate_directory_size(self, path: Path) -> int:
        """Calculate total disk usage in bytes for a directory."""
        if not path.exists():
            return 0
        total = 0
        for p in path.glob("**/*"):
            if p.is_file():
                try:
                    total += p.stat().st_size
                except OSError:
                    pass
        return total

    def create_isolated_worktree(
        self,
        owner: str,
        repo: str,
        branch_name: str,
        base_branch: str = "main",
    ) -> IsolatedWorkspace:
        """Create a dedicated, isolated git worktree for safe code editing."""
        repo_dir = self.git_manager._resolve_repo_path(owner, repo)
        if not (repo_dir / ".git").exists():
            raise FileNotFoundError(f"Source repository {owner}/{repo} not initialized or cloned.")

        repository = git.Repo(repo_dir)

        # Generate unique workspace directory
        ws_id = f"ws-{uuid.uuid4().hex[:10]}"
        target_worktree_dir = self.isolated_root / owner / repo / ws_id
        target_worktree_dir.parent.mkdir(parents=True, exist_ok=True)

        # Check if branch exists
        branch_exists = branch_name in [h.name for h in repository.heads]
        if branch_exists:
            # Checkout existing branch in worktree
            repository.git.worktree("add", str(target_worktree_dir), branch_name)
        else:
            # Create branch from base_branch
            repository.git.worktree("add", "-b", branch_name, str(target_worktree_dir), base_branch)

        metadata = IsolatedWorkspace(
            workspace_id=ws_id,
            owner=owner,
            repo=repo,
            branch_name=branch_name,
            base_branch=base_branch,
            worktree_path=str(target_worktree_dir),
            disk_limit_bytes=self.default_disk_limit,
        )
        self._active_workspaces[ws_id] = metadata
        return metadata

    def _validate_path_containment(self, workspace: IsolatedWorkspace, relative_path: str) -> Path:
        """Strictly ensure relative_path does not escape worktree sandbox."""
        worktree = Path(workspace.worktree_path).resolve()
        target = (worktree / relative_path).resolve()
        if not str(target).startswith(str(worktree)):
            raise GitSecurityException(
                f"Path traversal detected: '{relative_path}' escapes workspace."
            )
        return target

    def write_file(
        self, workspace: IsolatedWorkspace, relative_path: str, content: str
    ) -> dict[str, Any]:
        """Write content to file within isolated worktree with disk quota checks."""
        target_file = self._validate_path_containment(workspace, relative_path)
        worktree = Path(workspace.worktree_path)

        # Enforce disk usage limits
        current_size = self._calculate_directory_size(worktree)
        new_size = current_size + len(content.encode("utf-8"))
        if new_size > workspace.disk_limit_bytes:
            raise DiskQuotaExceededException(
                f"Disk usage ({new_size} bytes) exceeds workspace quota ({workspace.disk_limit_bytes} bytes)."
            )

        target_file.parent.mkdir(parents=True, exist_ok=True)
        target_file.write_text(content, encoding="utf-8")

        return {
            "status": "written",
            "path": relative_path,
            "bytes_written": len(content),
            "total_workspace_size": new_size,
        }

    def get_diff(self, workspace: IsolatedWorkspace) -> str:
        """Generate unified diff of changes made within isolated worktree."""
        worktree = Path(workspace.worktree_path)
        if not worktree.exists():
            return ""
        repo = git.Repo(worktree)
        # Compare against HEAD or staging
        diff_unstaged = repo.git.diff()
        diff_staged = repo.git.diff("--staged")
        return f"{diff_unstaged}\n{diff_staged}".strip()

    def get_structured_diff(self, workspace: IsolatedWorkspace) -> dict[str, Any]:
        """Parse unified diff into structured per-file metrics and patches."""
        raw_diff = self.get_diff(workspace)
        files = []
        total_additions = 0
        total_deletions = 0

        current_file = None
        current_patch = []
        file_additions = 0
        file_deletions = 0

        for line in raw_diff.splitlines():
            if line.startswith("diff --git"):
                if current_file:
                    files.append(
                        {
                            "filename": current_file,
                            "status": "modified",
                            "additions": file_additions,
                            "deletions": file_deletions,
                            "patch": "\n".join(current_patch),
                        }
                    )
                parts = line.split()
                current_file = parts[-1].lstrip("b/") if len(parts) >= 4 else "unknown"
                current_patch = [line]
                file_additions = 0
                file_deletions = 0
            else:
                if current_file:
                    current_patch.append(line)
                    if line.startswith("+") and not line.startswith("+++"):
                        file_additions += 1
                        total_additions += 1
                    elif line.startswith("-") and not line.startswith("---"):
                        file_deletions += 1
                        total_deletions += 1

        if current_file:
            files.append(
                {
                    "filename": current_file,
                    "status": "modified",
                    "additions": file_additions,
                    "deletions": file_deletions,
                    "patch": "\n".join(current_patch),
                }
            )

        summary = f"{len(files)} file(s) changed, +{total_additions} additions, -{total_deletions} deletions"

        return {
            "summary": summary,
            "total_files": len(files),
            "total_additions": total_additions,
            "total_deletions": total_deletions,
            "files": files,
            "raw_diff": raw_diff,
        }

    def commit_changes(self, workspace: IsolatedWorkspace, message: str) -> str:
        """Stage all modifications and commit within isolated worktree."""
        worktree = Path(workspace.worktree_path)
        repo = git.Repo(worktree)
        repo.git.add(all=True)
        commit = repo.index.commit(message)
        return commit.hexsha

    def cleanup_workspace(self, workspace: IsolatedWorkspace) -> bool:
        """Remove worktree and delete directory from disk cleanly."""
        worktree = Path(workspace.worktree_path)
        repo_dir = self.git_manager._resolve_repo_path(workspace.owner, workspace.repo)

        try:
            if (repo_dir / ".git").exists():
                repo = git.Repo(repo_dir)
                try:
                    repo.git.worktree("remove", "--force", str(worktree))
                except Exception:
                    pass
                try:
                    repo.git.worktree("prune")
                except Exception:
                    pass
        except Exception:
            pass

        if worktree.exists():
            shutil.rmtree(worktree, ignore_errors=True)

        self._active_workspaces.pop(workspace.workspace_id, None)
        return True
