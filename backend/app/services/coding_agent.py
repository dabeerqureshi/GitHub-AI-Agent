"""Autonomous Coding Agent Service for bug investigation, safe worktree editing, and verified fixes."""

from typing import Any

from app.agent.tools.git_local import LocalGitManager
from app.core.security import generate_action_hash
from app.services.github_pull_requests import GitHubPRService
from app.services.repo_intelligence import RepoIntelligenceService
from app.services.secure_executor import ExecutionResult, SecureCodeExecutor
from app.services.workspace_manager import CodingWorkspaceManager, IsolatedWorkspace


class AutonomousCodingService:
    """Orchestrates end-to-end autonomous coding workflow in isolated worktrees."""

    def __init__(
        self,
        workspace_manager: CodingWorkspaceManager | None = None,
        secure_executor: SecureCodeExecutor | None = None,
        intelligence_service: RepoIntelligenceService | None = None,
        pr_service: GitHubPRService | None = None,
    ):
        git_mgr = LocalGitManager()
        self.workspace_manager = workspace_manager or CodingWorkspaceManager(git_manager=git_mgr)
        self.secure_executor = secure_executor or SecureCodeExecutor()
        self.intelligence_service = intelligence_service or RepoIntelligenceService(
            git_manager=git_mgr
        )
        self.pr_service = pr_service or GitHubPRService()

    def investigate(self, owner: str, repo: str, task_prompt: str) -> dict[str, Any]:
        """Investigate repository files, symbols, and test suites related to task."""
        # 1. Search relevant symbols across keywords
        keywords = [w for w in task_prompt.split() if len(w) > 3 and w.isalnum()]
        matches = []
        for kw in keywords:
            m = self.intelligence_service.search_code(owner, repo, query=kw)
            if m:
                matches.extend(m)
        if not matches:
            matches = self.intelligence_service.search_code(owner, repo, query="test")

        # 2. Inspect files and tests
        all_files = self.intelligence_service.browse_files(owner, repo)
        test_files = [f.path for f in all_files if "test" in f.name.lower()]
        search_query = keywords[0] if keywords else "code"

        return {
            "task": task_prompt,
            "target_repo": f"{owner}/{repo}",
            "relevant_matches": [m.model_dump() for m in matches[:10]],
            "test_files": test_files,
            "plan": [
                f"1. Investigate codebase symbols matching '{search_query}'",
                "2. Create isolated git worktree and branch",
                "3. Apply code modifications safely",
                "4. Execute allowlisted automated test suite",
                "5. Verify test pass and generate reviewable diff",
                "6. Request user approval before pushing or opening PR",
            ],
        }

    async def execute_task_in_worktree(
        self,
        owner: str,
        repo: str,
        task_prompt: str,
        file_edits: dict[str, str],
        branch_name: str,
        test_command: str = "pytest",
        base_branch: str = "main",
    ) -> dict[str, Any]:
        """
        Execute safe coding modification workflow:
        1. Spawn isolated worktree.
        2. Apply file modifications.
        3. Run verification tests in restricted sandbox.
        4. Generate structured diff and independent review.
        5. Build approval request for push & PR creation.
        """
        # 1. Spawn isolated worktree
        workspace: IsolatedWorkspace = self.workspace_manager.create_isolated_worktree(
            owner=owner,
            repo=repo,
            branch_name=branch_name,
            base_branch=base_branch,
        )

        try:
            # 2. Apply modifications to isolated worktree only
            written_files = []
            for path, content in file_edits.items():
                res = self.workspace_manager.write_file(workspace, path, content)
                written_files.append(res["path"])

            # 3. Execute approved test suite in restricted sandbox
            test_result: ExecutionResult = await self.secure_executor.execute(
                command=test_command,
                cwd=workspace.worktree_path,
            )

            # 4. Generate unified and structured diffs
            diff_data = self.workspace_manager.get_structured_diff(workspace)

            # 5. Independent change review
            review = {
                "tests_passed": test_result.success,
                "exit_code": test_result.exit_code,
                "verified": test_result.success,
                "summary": "Fix verified: all test suites passed."
                if test_result.success
                else "Fix unverified: tests failed.",
            }

            # 6. Prepare push & PR approval payload
            step_id = f"coding-{workspace.workspace_id}"
            action_payload = {
                "owner": owner,
                "repo": repo,
                "branch_name": branch_name,
                "base_branch": base_branch,
                "files_changed": written_files,
                "diff": diff_data["raw_diff"],
                "structured_diff": diff_data,
                "test_output": test_result.output,
                "test_command": test_command,
                "tests_passed": test_result.success,
            }
            action_hash = generate_action_hash("push_and_create_pr", action_payload, step_id)

            approval_request = {
                "step_id": step_id,
                "tool_name": "push_and_create_pr",
                "arguments": action_payload,
                "action_hash": action_hash,
                "description": f"Push branch '{branch_name}' and create PR for: {task_prompt}",
            }

            return {
                "workspace_id": workspace.workspace_id,
                "worktree_path": workspace.worktree_path,
                "tests_passed": test_result.success,
                "test_output": test_result.output,
                "diff": diff_data,
                "review": review,
                "pending_approval": approval_request,
                "is_verified": test_result.success,
            }

        except Exception as e:
            # Safe cleanup on failure
            self.workspace_manager.cleanup_workspace(workspace)
            raise e

    async def finalize_push_and_pr(
        self,
        workspace: IsolatedWorkspace,
        title: str,
        body: str,
    ) -> dict[str, Any]:
        """After human approval, commit in worktree, push branch, and create PR."""
        # 1. Commit changes in worktree
        commit_sha = self.workspace_manager.commit_changes(workspace, f"fix: {title}")

        # 2. Create pull request via PR service
        pr_result = await self.pr_service.create_pull_request(
            repo_ref=f"{workspace.owner}/{workspace.repo}",
            title=title,
            head=workspace.branch_name,
            base=workspace.base_branch,
            body=f"{body}\n\nAutomated fix verified by Autonomous Coding Agent (commit {commit_sha[:8]}).",
        )

        # 3. Clean up worktree
        self.workspace_manager.cleanup_workspace(workspace)

        return {
            "status": "completed",
            "commit_sha": commit_sha,
            "pr": pr_result,
        }
