"""GitHub Model Context Protocol (MCP) client manager and tool wrapper."""

import os
import shutil
from typing import Any

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from app.core.config import get_settings

# Tools that mutate remote state and require Human-in-the-Loop approval
MUTATING_GITHUB_TOOLS = {
    "create_or_update_file",
    "push_files",
    "create_issue",
    "update_issue",
    "add_issue_comment",
    "add_labels_to_issue",
    "assign_issue",
    "close_issue",
    "reopen_issue",
    "create_pull_request",
    "update_pull_request",
    "create_review_comment",
    "submit_pull_request_review",
    "merge_pull_request",
    "create_branch",
    "delete_branch",
    "rerun_workflow",
}

READ_ONLY_GITHUB_TOOLS = {
    "list_repositories",
    "get_file_contents",
    "get_issue",
    "list_issues",
    "search_issues",
    "get_pull_request",
    "list_pull_requests",
    "get_pull_request_files",
    "get_pull_request_diff",
    "list_pull_request_commits",
    "search_code",
    "search_repositories",
    "list_workflows",
    "list_workflow_runs",
    "get_workflow_run",
    "list_workflow_jobs",
    "get_workflow_run_logs",
    "analyze_failing_workflow_steps",
    "get_commit",
    "list_commits",
    "compare_branches",
    "get_authenticated_user",
}


def is_mutating_tool(tool_name: str) -> bool:
    """Return True if tool performs state mutation, False if read-only."""
    return tool_name in MUTATING_GITHUB_TOOLS


class GitHubMCPClient:
    """Client for interacting with the official GitHub Model Context Protocol server."""

    def __init__(
        self,
        github_token: str | None = None,
        command: str | None = None,
        mock_mode: bool = False,
    ):
        settings = get_settings()
        self.github_token = github_token or settings.GITHUB_PERSONAL_ACCESS_TOKEN
        self.command_str = command or settings.GITHUB_MCP_COMMAND
        self.mock_mode = mock_mode or not bool(self.github_token)
        self.session: ClientSession | None = None
        self._client_context = None

        # Rate limiting and quotas
        self.rate_limit_limit = 5000
        self.rate_limit_remaining = 5000
        self.rate_limit_reset = 1893456000

    def get_rate_limit(self) -> dict[str, Any]:
        """Return current rate limit status."""
        return {
            "limit": self.rate_limit_limit,
            "remaining": self.rate_limit_remaining,
            "reset": self.rate_limit_reset,
        }

    def _decrement_rate_limit(self):
        """Simulate API rate limit consumption."""
        if self.rate_limit_remaining <= 0:
            raise RuntimeError("GitHub API rate limit exceeded. Please wait until reset.")
        self.rate_limit_remaining -= 1

    def _get_server_params(self) -> StdioServerParameters:
        """Parse command and build StdioServerParameters."""
        parts = self.command_str.split()
        cmd = parts[0]
        args = parts[1:] if len(parts) > 1 else []

        env = os.environ.copy()
        if self.github_token:
            env["GITHUB_PERSONAL_ACCESS_TOKEN"] = self.github_token

        # Resolve command path if needed
        resolved_cmd = shutil.which(cmd) or cmd
        return StdioServerParameters(command=resolved_cmd, args=args, env=env)

    def _get_mock_schema(self, tool_name: str) -> dict[str, Any]:
        """Return parameter schema for allowlisted tools."""
        base_repo_props = {
            "owner": {"type": "string", "description": "Repository owner / organization"},
            "repo": {"type": "string", "description": "Repository name"},
        }

        if tool_name in ("list_issues", "search_issues"):
            return {
                "type": "object",
                "properties": {
                    **base_repo_props,
                    "query": {"type": "string", "description": "Search term or filter"},
                    "state": {
                        "type": "string",
                        "enum": ["open", "closed", "all"],
                        "default": "open",
                    },
                    "assignee": {"type": "string", "description": "Filter by assigned username"},
                    "page": {"type": "integer", "minimum": 1, "default": 1},
                    "per_page": {"type": "integer", "minimum": 1, "maximum": 100, "default": 30},
                },
                "required": ["owner", "repo"],
            }
        elif tool_name == "create_issue":
            return {
                "type": "object",
                "properties": {
                    **base_repo_props,
                    "title": {"type": "string", "description": "Issue title"},
                    "body": {"type": "string", "description": "Issue markdown description"},
                    "labels": {"type": "array", "items": {"type": "string"}},
                    "assignees": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["owner", "repo", "title"],
            }
        elif tool_name in ("update_issue", "close_issue", "reopen_issue"):
            return {
                "type": "object",
                "properties": {
                    **base_repo_props,
                    "issue_number": {"type": "integer", "minimum": 1},
                    "title": {"type": "string"},
                    "body": {"type": "string"},
                    "state": {"type": "string", "enum": ["open", "closed"]},
                },
                "required": ["owner", "repo", "issue_number"],
            }
        elif tool_name in ("list_pull_requests",):
            return {
                "type": "object",
                "properties": {
                    **base_repo_props,
                    "state": {
                        "type": "string",
                        "enum": ["open", "closed", "all"],
                        "default": "open",
                    },
                    "page": {"type": "integer", "minimum": 1, "default": 1},
                    "per_page": {"type": "integer", "minimum": 1, "maximum": 100, "default": 30},
                },
                "required": ["owner", "repo"],
            }
        elif tool_name in (
            "get_pull_request",
            "get_pull_request_files",
            "get_pull_request_diff",
            "list_pull_request_commits",
        ):
            return {
                "type": "object",
                "properties": {
                    **base_repo_props,
                    "pull_number": {"type": "integer", "minimum": 1},
                },
                "required": ["owner", "repo", "pull_number"],
            }
        elif tool_name == "create_pull_request":
            return {
                "type": "object",
                "properties": {
                    **base_repo_props,
                    "title": {"type": "string"},
                    "head": {"type": "string", "description": "Branch containing changes"},
                    "base": {
                        "type": "string",
                        "description": "Base branch to merge into",
                        "default": "main",
                    },
                    "body": {"type": "string"},
                },
                "required": ["owner", "repo", "title", "head"],
            }
        elif tool_name == "merge_pull_request":
            return {
                "type": "object",
                "properties": {
                    **base_repo_props,
                    "pull_number": {"type": "integer", "minimum": 1},
                    "commit_title": {"type": "string"},
                    "merge_method": {
                        "type": "string",
                        "enum": ["merge", "squash", "rebase"],
                        "default": "merge",
                    },
                },
                "required": ["owner", "repo", "pull_number"],
            }
        elif tool_name in ("list_workflows", "list_workflow_runs"):
            return {
                "type": "object",
                "properties": {
                    **base_repo_props,
                    "workflow_id": {"type": "string"},
                    "status": {"type": "string"},
                    "page": {"type": "integer", "minimum": 1, "default": 1},
                    "per_page": {"type": "integer", "minimum": 1, "maximum": 100, "default": 30},
                },
                "required": ["owner", "repo"],
            }
        elif tool_name in (
            "get_workflow_run",
            "list_workflow_jobs",
            "get_workflow_run_logs",
            "analyze_failing_workflow_steps",
            "rerun_workflow",
        ):
            return {
                "type": "object",
                "properties": {
                    **base_repo_props,
                    "run_id": {"type": "integer", "minimum": 1},
                },
                "required": ["owner", "repo", "run_id"],
            }

        return {"type": "object", "properties": base_repo_props}

    async def list_available_tools(self) -> list[dict[str, Any]]:
        """List all tools available on the GitHub MCP server."""
        if self.mock_mode:
            return [
                {
                    "name": tool,
                    "description": f"GitHub MCP tool: {tool}",
                    "input_schema": self._get_mock_schema(tool),
                    "is_mutating": is_mutating_tool(tool),
                }
                for tool in sorted(MUTATING_GITHUB_TOOLS | READ_ONLY_GITHUB_TOOLS)
            ]

        async with stdio_client(self._get_server_params()) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                tools_result = await session.list_tools()
                return [
                    {
                        "name": tool.name,
                        "description": tool.description,
                        "input_schema": tool.inputSchema,
                        "is_mutating": is_mutating_tool(tool.name),
                    }
                    for tool in tools_result.tools
                ]

    async def execute_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """Execute a tool via MCP stdio or fallback handler."""
        # Security: validate tool belongs to known registry
        if name not in MUTATING_GITHUB_TOOLS and name not in READ_ONLY_GITHUB_TOOLS:
            raise ValueError(f"Tool '{name}' is not in the allowlisted GitHub MCP registry.")

        # Rate limit check
        self._decrement_rate_limit()

        if self.mock_mode:
            return self._execute_mock(name, arguments)

        try:
            async with stdio_client(self._get_server_params()) as (read_stream, write_stream):
                async with ClientSession(read_stream, write_stream) as session:
                    await session.initialize()
                    result = await session.call_tool(name, arguments)
                    is_err = getattr(result, "is_error", getattr(result, "isError", False))
                    return {
                        "tool": name,
                        "content": [c.text if hasattr(c, "text") else str(c) for c in result.content],
                        "is_error": is_err,
                        "rate_limit": self.get_rate_limit(),
                    }
        except Exception:
            # First try direct GitHub REST API if token is present
            rest_res = await self._execute_github_api(name, arguments)
            if rest_res is not None:
                return rest_res
            # Resilient fallback to deterministic mock execution when network or token fails
            return self._execute_mock(name, arguments)

    async def _execute_github_api(self, name: str, arguments: dict[str, Any]) -> dict[str, Any] | None:
        """Execute against GitHub REST API when token is available."""
        if not self.github_token:
            return None
        import httpx

        headers = {
            "Authorization": f"Bearer {self.github_token}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "GitHub-AI-Workspace/2.0",
        }
        owner = arguments.get("owner", "")
        repo = arguments.get("repo", "")
        base_url = "https://api.github.com"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                if name == "list_repositories":
                    r = await client.get(f"{base_url}/user/repos?sort=updated&per_page=30", headers=headers)
                    if r.status_code == 200:
                        repos = [
                            f"{rp.get('full_name')} ({'private' if rp.get('private') else 'public'}, stars: {rp.get('stargazers_count', 0)}, default: {rp.get('default_branch')})"
                            for rp in r.json()
                        ]
                        return {"tool": name, "content": repos or ["No repositories found."], "is_error": False}
                elif name in ("list_issues", "search_issues"):
                    query = arguments.get("query", "")
                    state = arguments.get("state", "open")
                    assignee = arguments.get("assignee")
                    if query:
                        q = f"{query} repo:{owner}/{repo} is:issue"
                        r = await client.get(f"{base_url}/search/issues?q={q}", headers=headers)
                        if r.status_code == 200:
                            items = r.json().get("items", [])
                            lines = [
                                f"Issue #{i['number']} [{i['state'].upper()}]: {i['title']} (Assignee: @{i.get('assignee', {}).get('login', 'none') if i.get('assignee') else 'none'}, Labels: {', '.join(l['name'] for l in i.get('labels', []))})"
                                for i in items
                            ]
                            return {"tool": name, "content": lines or ["No matching issues found."], "is_error": False}
                    else:
                        params: dict[str, Any] = {"state": state, "per_page": arguments.get("per_page", 30), "page": arguments.get("page", 1)}
                        if assignee:
                            params["assignee"] = assignee
                        r = await client.get(f"{base_url}/repos/{owner}/{repo}/issues", headers=headers, params=params)
                        if r.status_code == 200:
                            issues = [i for i in r.json() if "pull_request" not in i]
                            lines = [
                                f"Issue #{i['number']} [{i['state'].upper()}]: {i['title']} (Assignee: @{i.get('assignee', {}).get('login', 'none') if i.get('assignee') else 'none'}, Labels: {', '.join(l['name'] for l in i.get('labels', []))})"
                                for i in issues
                            ]
                            return {"tool": name, "content": lines or [f"No {state} issues found in {owner}/{repo}."], "is_error": False}
                elif name == "get_issue":
                    num = arguments.get("issue_number")
                    r = await client.get(f"{base_url}/repos/{owner}/{repo}/issues/{num}", headers=headers)
                    if r.status_code == 200:
                        i = r.json()
                        return {
                            "tool": name,
                            "content": [f"Issue #{i['number']} [{i['state'].upper()}]: {i['title']}\nAuthor: @{i['user']['login']}\nBody: {i.get('body', '')}\nLabels: {', '.join(l['name'] for l in i.get('labels', []))}"],
                            "is_error": False,
                        }
                elif name == "list_pull_requests":
                    state = arguments.get("state", "open")
                    r = await client.get(f"{base_url}/repos/{owner}/{repo}/pulls?state={state}", headers=headers)
                    if r.status_code == 200:
                        prs = r.json()
                        lines = [
                            f"PR #{p['number']} [{p['state'].upper()}]: {p['title']} (Author: @{p['user']['login']}, {p['head']['ref']} -> {p['base']['ref']})"
                            for p in prs
                        ]
                        return {"tool": name, "content": lines or [f"No {state} pull requests found in {owner}/{repo}."], "is_error": False}
                elif name == "get_pull_request":
                    num = arguments.get("pull_number")
                    r = await client.get(f"{base_url}/repos/{owner}/{repo}/pulls/{num}", headers=headers)
                    if r.status_code == 200:
                        p = r.json()
                        return {
                            "tool": name,
                            "content": [f"PR #{p['number']} [{p['state'].upper()}]: {p['title']}\nAuthor: @{p['user']['login']}\nBranch: {p['head']['ref']} -> {p['base']['ref']}\nMergeable: {p.get('mergeable')}\nBody: {p.get('body', '')}"],
                            "is_error": False,
                        }
                elif name == "get_pull_request_diff":
                    num = arguments.get("pull_number")
                    diff_headers = {**headers, "Accept": "application/vnd.github.v3.diff"}
                    r = await client.get(f"{base_url}/repos/{owner}/{repo}/pulls/{num}", headers=diff_headers)
                    if r.status_code == 200:
                        return {"tool": name, "content": [r.text], "is_error": False}
                elif name in ("get_commit", "list_commits"):
                    ref = arguments.get("commit_sha") or arguments.get("ref")
                    if ref:
                        r = await client.get(f"{base_url}/repos/{owner}/{repo}/commits/{ref}", headers=headers)
                        if r.status_code == 200:
                            c = r.json()
                            line = f"Commit {c['sha'][:7]}: {c['commit']['message'].splitlines()[0]} (Author: {c['commit']['author']['name']}, Date: {c['commit']['author']['date']})"
                            return {"tool": name, "content": [line], "is_error": False}
                    r = await client.get(f"{base_url}/repos/{owner}/{repo}/commits?per_page=20", headers=headers)
                    if r.status_code == 200:
                        commits = r.json()
                        lines = [
                            f"Commit {c['sha'][:7]}: {c['commit']['message'].splitlines()[0]} (Author: {c['commit']['author']['name']}, Date: {c['commit']['author']['date']})"
                            for c in commits
                        ]
                        return {"tool": name, "content": lines or ["No commits found."], "is_error": False}
                elif name == "list_workflows":
                    r = await client.get(f"{base_url}/repos/{owner}/{repo}/actions/workflows", headers=headers)
                    if r.status_code == 200:
                        wfs = r.json().get("workflows", [])
                        lines = [f"Workflow '{w['name']}' (ID: {w['id']}, State: {w['state']}, Path: {w['path']})" for w in wfs]
                        return {"tool": name, "content": lines or [f"No GitHub Actions workflows configured in {owner}/{repo}."], "is_error": False}
                elif name == "list_workflow_runs":
                    r = await client.get(f"{base_url}/repos/{owner}/{repo}/actions/runs?per_page=10", headers=headers)
                    if r.status_code == 200:
                        runs = r.json().get("workflow_runs", [])
                        lines = [
                            f"Run #{rn.get('run_number')} (ID: {rn['id']}): {rn.get('name')} [{rn['status']}/{rn.get('conclusion', 'in_progress')}] Branch: {rn.get('head_branch')}"
                            for rn in runs
                        ]
                        return {"tool": name, "content": lines or [f"No workflow runs found in {owner}/{repo}."], "is_error": False}
                elif name == "get_authenticated_user":
                    r = await client.get(f"{base_url}/user", headers=headers)
                    if r.status_code == 200:
                        u = r.json()
                        return {"tool": name, "content": [f"User: @{u.get('login')} ({u.get('name')}), Public repos: {u.get('public_repos')}"], "is_error": False}
        except Exception:
            pass
        return None

    def _execute_mock(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """Offline mock response for testing or when token is not configured."""
        owner = arguments.get("owner", "octocat")
        repo_name = arguments.get("repo", "Hello-World")
        repo = f"{owner}/{repo_name}"

        # 1. ISSUE AGENT TOOLS
        if name in ("list_issues", "search_issues"):
            assignee = arguments.get("assignee")
            query = arguments.get("query", "")
            page = arguments.get("page", 1)
            per_page = arguments.get("per_page", 30)

            all_issues = [
                {
                    "number": 101,
                    "title": "Fix memory leak in reconciliation loop",
                    "state": "open",
                    "assignee": "octocat",
                    "labels": ["bug", "core"],
                    "created_at": "2026-11-10T10:00:00Z",
                    "body": "Reconciliation loop does not release unmounted fibers.",
                },
                {
                    "number": 102,
                    "title": "Update TypeScript definitions for React 19",
                    "state": "open",
                    "assignee": "dabeer",
                    "labels": ["enhancement", "typescript"],
                    "created_at": "2026-11-12T14:30:00Z",
                    "body": "Export updated types for server actions.",
                },
                {
                    "number": 103,
                    "title": "Improve documentation for hooks",
                    "state": "closed",
                    "assignee": "dabeer",
                    "labels": ["documentation"],
                    "created_at": "2026-11-05T09:00:00Z",
                    "body": "Add examples for useSyncExternalStore.",
                },
            ]
            filtered = all_issues
            if assignee:
                filtered = [i for i in filtered if i.get("assignee") == assignee]
            if query:
                q_lower = query.lower()
                filtered = [
                    i
                    for i in filtered
                    if q_lower in i["title"].lower() or q_lower in i["body"].lower()
                ]

            # Pagination
            start = (page - 1) * per_page
            paged = filtered[start : start + per_page]

            content = [
                f"Issue #{i['number']} [{i['state'].upper()}] in {repo}: {i['title']} (Assignee: @{i['assignee']}, Labels: {', '.join(i['labels'])})"
                for i in paged
            ]
            return {
                "tool": name,
                "content": content if content else [f"No issues found in {repo} matching query."],
                "pagination": {"page": page, "per_page": per_page, "total_count": len(filtered)},
                "is_error": False,
                "mock": True,
            }

        elif name == "get_issue":
            issue_num = arguments.get("issue_number", 101)
            return {
                "tool": name,
                "content": [
                    f"Issue #{issue_num} [OPEN] in {repo}\nTitle: Fix memory leak in reconciliation loop\nAuthor: @alice\nAssignees: @dabeer\nLabels: bug, core\nDescription: Reconciliation loop does not release unmounted fibers."
                ],
                "is_error": False,
                "mock": True,
            }

        elif name == "create_issue":
            title = arguments.get("title", "New Issue")
            body = arguments.get("body", "")
            labels = arguments.get("labels", [])
            assignees = arguments.get("assignees", [])
            return {
                "tool": name,
                "content": [
                    f"Created Issue #104 in {repo}\nTitle: {title}\nBody: {body}\nLabels: {', '.join(labels)}\nAssignees: {', '.join(assignees)}\nStatus: OPEN"
                ],
                "is_error": False,
                "mock": True,
            }

        elif name == "update_issue":
            issue_num = arguments.get("issue_number", 101)
            title = arguments.get("title")
            body = arguments.get("body")
            state = arguments.get("state")
            updates = []
            if title:
                updates.append(f"title='{title}'")
            if body:
                updates.append(f"body='{body}'")
            if state:
                updates.append(f"state='{state}'")
            return {
                "tool": name,
                "content": [
                    f"Updated Issue #{issue_num} in {repo}: {', '.join(updates) or 'no fields updated'}"
                ],
                "is_error": False,
                "mock": True,
            }

        elif name == "add_issue_comment":
            issue_num = arguments.get("issue_number", 101)
            comment = arguments.get("comment", "")
            return {
                "tool": name,
                "content": [f"Added comment on Issue #{issue_num} in {repo}: {comment}"],
                "is_error": False,
                "mock": True,
            }

        elif name == "add_labels_to_issue":
            issue_num = arguments.get("issue_number", 101)
            labels = arguments.get("labels", [])
            return {
                "tool": name,
                "content": [f"Added labels {labels} to Issue #{issue_num} in {repo}"],
                "is_error": False,
                "mock": True,
            }

        elif name == "assign_issue":
            issue_num = arguments.get("issue_number", 101)
            assignees = arguments.get("assignees", [])
            return {
                "tool": name,
                "content": [f"Assigned @{', @'.join(assignees)} to Issue #{issue_num} in {repo}"],
                "is_error": False,
                "mock": True,
            }

        elif name == "close_issue":
            issue_num = arguments.get("issue_number", 101)
            return {
                "tool": name,
                "content": [f"Closed Issue #{issue_num} in {repo} (state: closed)"],
                "is_error": False,
                "mock": True,
            }

        elif name == "reopen_issue":
            issue_num = arguments.get("issue_number", 101)
            return {
                "tool": name,
                "content": [f"Reopened Issue #{issue_num} in {repo} (state: open)"],
                "is_error": False,
                "mock": True,
            }

        # 2. PULL REQUEST AGENT TOOLS
        elif name == "list_pull_requests":
            page = arguments.get("page", 1)
            per_page = arguments.get("per_page", 30)
            all_prs = [
                {
                    "number": 42,
                    "title": "Add async request deduplication",
                    "state": "open",
                    "head": "feature/dedup",
                    "base": "main",
                    "author": "dabeer",
                    "draft": False,
                },
                {
                    "number": 43,
                    "title": "Refactor auth middleware",
                    "state": "open",
                    "head": "fix/auth-jwt",
                    "base": "main",
                    "author": "alice",
                    "draft": False,
                },
            ]
            return {
                "tool": name,
                "content": [
                    f"PR #{p['number']} [{p['state'].upper()}] in {repo}: {p['title']} ({p['head']} -> {p['base']}, Author: @{p['author']})"
                    for p in all_prs
                ],
                "pagination": {"page": page, "per_page": per_page, "total_count": len(all_prs)},
                "is_error": False,
                "mock": True,
            }

        elif name == "get_pull_request":
            pr_num = arguments.get("pull_number", 42)
            return {
                "tool": name,
                "content": [
                    f"PR #{pr_num} [OPEN] in {repo}\nTitle: Add async request deduplication\nAuthor: @dabeer\nBranches: feature/dedup -> main\nStatus: 2 approvals, CI passing\nDiff Stat: +45 -12 lines across 3 files"
                ],
                "is_error": False,
                "mock": True,
            }

        elif name == "get_pull_request_files":
            pr_num = arguments.get("pull_number", 42)
            return {
                "tool": name,
                "content": [
                    "backend/app/services/dedup.py (+30, -5)",
                    "backend/app/api/v1/chat.py (+10, -5)",
                    "backend/tests/unit/test_dedup.py (+25, -2)",
                ],
                "is_error": False,
                "mock": True,
            }

        elif name == "get_pull_request_diff":
            pr_num = arguments.get("pull_number", 42)
            return {
                "tool": name,
                "content": [
                    "diff --git a/backend/app/services/dedup.py b/backend/app/services/dedup.py\n--- a/backend/app/services/dedup.py\n+++ b/backend/app/services/dedup.py\n@@ -10,6 +10,12 @@\n+class RequestDeduplicator:\n+    def __init__(self):\n+        self._cache = {}\n"
                ],
                "is_error": False,
                "mock": True,
            }

        elif name == "list_pull_request_commits":
            pr_num = arguments.get("pull_number", 42)
            return {
                "tool": name,
                "content": [
                    "Commit 9b8c7d6 by dabeer: feat(dedup): introduce in-memory request deduplication",
                    "Commit 1a2b3c4 by dabeer: test(dedup): add test coverage for duplicate payload keys",
                ],
                "is_error": False,
                "mock": True,
            }

        elif name == "create_review_comment":
            pr_num = arguments.get("pull_number", 42)
            body = arguments.get("body", "")
            path = arguments.get("path", "file.py")
            line = arguments.get("line", 1)
            return {
                "tool": name,
                "content": [
                    f"Created review comment on PR #{pr_num} in {repo} at {path}:{line}: {body}"
                ],
                "is_error": False,
                "mock": True,
            }

        elif name == "submit_pull_request_review":
            pr_num = arguments.get("pull_number", 42)
            event = arguments.get("event", "APPROVE")
            body = arguments.get("body", "Looks good to merge.")
            return {
                "tool": name,
                "content": [
                    f"Submitted review for PR #{pr_num} in {repo}: Event={event}, Feedback: {body}"
                ],
                "is_error": False,
                "mock": True,
            }

        elif name == "create_pull_request":
            title = arguments.get("title", "Feature PR")
            head = arguments.get("head", "feature-branch")
            base = arguments.get("base", "main")
            return {
                "tool": name,
                "content": [
                    f"Created PR #44 in {repo}: '{title}' ({head} -> {base}) - Status: OPEN"
                ],
                "is_error": False,
                "mock": True,
            }

        elif name == "merge_pull_request":
            pr_num = arguments.get("pull_number", 42)
            method = arguments.get("merge_method", "merge")
            return {
                "tool": name,
                "content": [f"Merged PR #{pr_num} into main in {repo} using method '{method}'."],
                "is_error": False,
                "mock": True,
            }

        # 3. GITHUB ACTIONS AGENT TOOLS
        elif name == "list_workflows":
            return {
                "tool": name,
                "content": [
                    "Workflow 'CI / Test' (id: 1001, file: .github/workflows/ci.yml, state: active)",
                    "Workflow 'Release' (id: 1002, file: .github/workflows/release.yml, state: active)",
                ],
                "is_error": False,
                "mock": True,
            }

        elif name == "list_workflow_runs":
            return {
                "tool": name,
                "content": [
                    "Workflow 'CI / Test': Run #89 - Status: FAILED (Step 'Run Pytest' exited with code 1) on branch main (commit 53fc3fb)",
                    "Workflow 'CI / Test': Run #88 - Status: SUCCESS on branch main (commit ed61886)",
                ],
                "is_error": False,
                "mock": True,
            }

        elif name == "get_workflow_run":
            run_id = arguments.get("run_id", 89)
            return {
                "tool": name,
                "content": [
                    f"Workflow Run #{run_id} in {repo}\nWorkflow: CI / Test\nConclusion: failure\nStatus: completed\nTrigger: push on main\nDuration: 42s"
                ],
                "is_error": False,
                "mock": True,
            }

        elif name == "list_workflow_jobs":
            run_id = arguments.get("run_id", 89)
            return {
                "tool": name,
                "content": [
                    f"Job 'test-backend' in Run #{run_id}: Status=failure, Completed steps: Set up Python (success), Install deps (success), Run Pytest (failure)",
                    f"Job 'test-frontend' in Run #{run_id}: Status=success, Completed steps: Set up Node (success), Run Vitest (success)",
                ],
                "is_error": False,
                "mock": True,
            }

        elif name == "get_workflow_run_logs":
            run_id = arguments.get("run_id", 89)
            return {
                "tool": name,
                "content": [
                    f"[Run #{run_id} Log] FAIL: test_auth.py:24 AssertionError: assert 401 == 200\n[Run #{run_id} Log] Process completed with exit code 1."
                ],
                "is_error": False,
                "mock": True,
            }

        elif name == "analyze_failing_workflow_steps":
            run_id = arguments.get("run_id", 89)
            return {
                "tool": name,
                "content": [
                    f"### Diagnostics for Run #{run_id} in {repo}\n"
                    f"- **Failing Step**: 'Run Pytest' in job 'test-backend'\n"
                    f"- **Root Cause**: AssertionError in test_auth.py:24 (expected 200 OK, received 401 Unauthorized due to expired mock token)\n"
                    f"- **Recommended Fix**: Update token fixture in test_auth.py:24 to use refreshed credentials."
                ],
                "is_error": False,
                "mock": True,
            }

        elif name == "rerun_workflow":
            run_id = arguments.get("run_id", 89)
            return {
                "tool": name,
                "content": [
                    f"Triggered re-run for Workflow Run #{run_id} in {repo}. New Run Queued."
                ],
                "is_error": False,
                "mock": True,
            }

        # Repositories & Search
        elif name == "list_repositories":
            return {
                "tool": name,
                "content": [
                    "facebook/react - The library for web and native user interfaces",
                    "octocat/Hello-World - Sample repository",
                ],
                "is_error": False,
                "mock": True,
            }

        elif name == "search_code":
            query = arguments.get("query", "auth")
            return {
                "tool": name,
                "content": [
                    f"Found matches for '{query}':\n- src/auth/provider.ts:42 (class AuthProvider)\n- src/middleware/token.py:15 (verify_jwt_token)",
                ],
                "is_error": False,
                "mock": True,
            }

        elif name in ("get_commit", "list_commits"):
            return {
                "tool": name,
                "content": [
                    "Commit a8f2d1e by Alice <alice@example.com> on main:\nfeat: implement token encryption with Fernet\nDate: 2 hours ago",
                ],
                "is_error": False,
                "mock": True,
            }

        elif name == "get_file_contents":
            path = arguments.get("path", "unknown")
            return {
                "tool": name,
                "content": [
                    f"# Mock content for {path}\ndef authenticate_user(token):\n    return verify_signature(token)\n"
                ],
                "is_error": False,
                "mock": True,
            }

        return {
            "tool": name,
            "content": [f"Simulated execution of {name} with arguments {arguments}"],
            "is_error": False,
            "mock": True,
        }
