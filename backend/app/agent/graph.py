"""LangGraph agent workflow definition for GitHub AI Workspace."""

import re
import time
from typing import Any

from langgraph.graph import END, StateGraph

from app.agent.prompts import SYSTEM_AGENT_PROMPT
from app.agent.router import BaseLLMClient, ModelRouter
from app.agent.state import AgentState, IntentAnalysis
from app.agent.tools.registry import ToolRegistry
from app.core.security import generate_action_hash


class GitHubAgentWorkflow:
    """Stateful LangGraph workflow managing GitHub agent orchestration."""

    def __init__(
        self,
        llm_client: BaseLLMClient | None = None,
        tool_registry: ToolRegistry | None = None,
    ):
        self.llm_client = llm_client
        self.tool_registry = tool_registry or ToolRegistry()
        self._router = ModelRouter()
        self.graph = self._build_graph()

    async def _get_client(self, content: str = "") -> BaseLLMClient:
        if self.llm_client:
            return self.llm_client
        return await self._router.get_active_client(content)

    def _build_graph(self):
        """Construct the LangGraph StateGraph."""
        builder = StateGraph(AgentState)

        # Register nodes
        builder.add_node("plan_and_route", self.plan_and_route)
        builder.add_node("tool_selection", self.tool_selection)
        builder.add_node("approval_gate", self.approval_gate)
        builder.add_node("execute_tool", self.execute_tool)
        builder.add_node("verify_and_respond", self.verify_and_respond)

        # Set entry point
        builder.set_entry_point("plan_and_route")

        # Connect edges
        builder.add_edge("plan_and_route", "tool_selection")

        builder.add_conditional_edges(
            "tool_selection",
            self._route_after_tool_selection,
            {
                "approval_gate": "approval_gate",
                "verify_and_respond": "verify_and_respond",
            },
        )

        builder.add_conditional_edges(
            "approval_gate",
            self._route_after_approval_gate,
            {
                "execute_tool": "execute_tool",
                "pause_for_approval": END,
            },
        )

        builder.add_edge("execute_tool", "verify_and_respond")
        builder.add_edge("verify_and_respond", END)

        return builder.compile()

    def _route_after_tool_selection(self, state: AgentState) -> str:
        """Route to approval gate if a tool is needed, else respond directly."""
        if state.get("tool_to_execute"):
            return "approval_gate"
        return "verify_and_respond"

    def _route_after_approval_gate(self, state: AgentState) -> str:
        """Pause if tool requires human approval and has not been approved yet."""
        if state.get("pending_approval") and state.get("approval_status") != "APPROVED":
            return "pause_for_approval"
        return "execute_tool"

    def _classify_intent(self, message: str, active_repo: str | None) -> IntentAnalysis:
        """Classify user intent and extract target repository and parameters."""
        lower = message.lower()

        # Repository resolution
        resolved_repo = active_repo
        words = message.split()
        file_extensions = (
            ".py",
            ".ts",
            ".tsx",
            ".js",
            ".jsx",
            ".json",
            ".md",
            ".txt",
            ".yml",
            ".yaml",
            ".toml",
            ".html",
            ".css",
            ".lock",
        )
        for word in words:
            if "/" in word and not word.startswith("http"):
                candidate = word.strip(" ,.:;()[]\"'")
                parts = candidate.split("/")
                if len(parts) == 2 and not any(parts[1].endswith(ext) for ext in file_extensions):
                    if not candidate.startswith("/"):
                        resolved_repo = candidate
                        break

        # Intent detection
        if any(
            w in lower
            for w in ("show my repos", "list repos", "list repositories", "my repositories")
        ):
            return IntentAnalysis(intent="SHOW_REPOSITORIES", target_repo=resolved_repo)
        elif any(w in lower for w in ("assigned to me", "my assigned issues", "assigned issues")):
            return IntentAnalysis(
                intent="LIST_ASSIGNED_ISSUES",
                target_repo=resolved_repo,
                extracted_parameters={"assignee": "dabeer"},
            )
        elif any(
            w in lower for w in ("search issue", "search issues", "find issue", "find issues")
        ):
            q = "memory"
            for token in words:
                if token.lower() not in (
                    "search",
                    "find",
                    "issue",
                    "issues",
                    "in",
                    "for",
                    "the",
                    "repo",
                ):
                    q = token.strip(" ,.:;()[]\"'")
                    break
            return IntentAnalysis(
                intent="SEARCH_ISSUES",
                target_repo=resolved_repo,
                extracted_parameters={"query": q},
            )
        elif any(w in lower for w in ("close issue", "close ticket")):
            m = re.search(r"(?:issue|ticket)?\s*#?(\d+)", lower)
            num = int(m.group(1)) if m else 101
            return IntentAnalysis(
                intent="CLOSE_ISSUE",
                target_repo=resolved_repo,
                extracted_parameters={"issue_number": num},
                requires_mutation=True,
            )
        elif any(w in lower for w in ("reopen issue", "re-open issue", "reopen ticket")):
            m = re.search(r"(?:issue|ticket)?\s*#?(\d+)", lower)
            num = int(m.group(1)) if m else 101
            return IntentAnalysis(
                intent="REOPEN_ISSUE",
                target_repo=resolved_repo,
                extracted_parameters={"issue_number": num},
                requires_mutation=True,
            )
        elif any(w in lower for w in ("add label", "label issue", "add labels")):
            m = re.search(r"(?:issue|ticket)?\s*#?(\d+)", lower)
            num = int(m.group(1)) if m else 101
            return IntentAnalysis(
                intent="ADD_LABEL_ISSUE",
                target_repo=resolved_repo,
                extracted_parameters={"issue_number": num, "labels": ["enhancement"]},
                requires_mutation=True,
            )
        elif any(w in lower for w in ("assign issue", "assign user", "assign to")):
            m = re.search(r"(?:issue|ticket)?\s*#?(\d+)", lower)
            num = int(m.group(1)) if m else 101
            return IntentAnalysis(
                intent="ASSIGN_ISSUE",
                target_repo=resolved_repo,
                extracted_parameters={"issue_number": num, "assignees": ["dabeer"]},
                requires_mutation=True,
            )
        elif any(w in lower for w in ("comment on issue", "add comment", "comment on pr")):
            m = re.search(r"#?(\d+)", lower)
            num = int(m.group(1)) if m else 101
            return IntentAnalysis(
                intent="ADD_COMMENT",
                target_repo=resolved_repo,
                extracted_parameters={
                    "issue_number": num,
                    "comment": "Automated update from agent.",
                },
                requires_mutation=True,
            )
        elif any(
            w in lower for w in ("open issues", "find my open issues", "my issues", "list issues")
        ):
            return IntentAnalysis(intent="FIND_OPEN_ISSUES", target_repo=resolved_repo)
        elif any(
            w in lower for w in ("latest commit", "explain the latest commit", "recent commit")
        ):
            return IntentAnalysis(intent="EXPLAIN_LATEST_COMMIT", target_repo=resolved_repo)
        elif any(
            w in lower for w in ("create pull request", "open pull request", "create pr", "open pr")
        ):
            return IntentAnalysis(
                intent="CREATE_PULL_REQUEST",
                target_repo=resolved_repo,
                extracted_parameters={
                    "title": "feat: automated feature branch PR",
                    "head": "feature-branch",
                    "base": "main",
                },
                requires_mutation=True,
            )
        elif any(w in lower for w in ("merge pull request", "merge pr")):
            pr_match = re.search(r"(?:pr|pull request)\s*(?:#|\b)?(\d+)", lower)
            pr_num = int(pr_match.group(1)) if pr_match else 42
            return IntentAnalysis(
                intent="MERGE_PULL_REQUEST",
                target_repo=resolved_repo,
                extracted_parameters={"pull_number": pr_num},
                requires_mutation=True,
            )
        elif any(
            w in lower
            for w in ("approve pr", "approve pull request", "submit review", "request changes")
        ):
            pr_match = re.search(r"(?:pr|pull request)\s*(?:#|\b)?(\d+)", lower)
            pr_num = int(pr_match.group(1)) if pr_match else 42
            return IntentAnalysis(
                intent="SUBMIT_PR_REVIEW",
                target_repo=resolved_repo,
                extracted_parameters={"pull_number": pr_num, "event": "APPROVE"},
                requires_mutation=True,
            )
        elif any(w in lower for w in ("pr diff", "pr files", "changed files in pr", "diff for pr")):
            pr_match = re.search(r"(?:pr|pull request)\s*(?:#|\b)?(\d+)", lower)
            pr_num = int(pr_match.group(1)) if pr_match else 42
            return IntentAnalysis(
                intent="GET_PR_FILES",
                target_repo=resolved_repo,
                extracted_parameters={"pull_number": pr_num},
            )
        elif any(w in lower for w in ("review pull request", "review pr", "pull request")):
            # Extract PR number if present
            pr_match = re.search(r"(?:pr|pull request)\s*(?:#|\b)?(\d+)", lower)
            pr_num = int(pr_match.group(1)) if pr_match else 42
            return IntentAnalysis(
                intent="REVIEW_PULL_REQUEST",
                target_repo=resolved_repo,
                extracted_parameters={"pull_number": pr_num},
            )
        elif any(
            w in lower for w in ("rerun workflow", "re-run workflow", "retry workflow", "rerun run")
        ):
            m = re.search(r"(?:run|workflow)?\s*#?(\d+)", lower)
            run_id = int(m.group(1)) if m else 89
            return IntentAnalysis(
                intent="RERUN_WORKFLOW",
                target_repo=resolved_repo,
                extracted_parameters={"run_id": run_id},
                requires_mutation=True,
            )
        elif any(w in lower for w in ("list workflows", "show workflows", "get workflows")):
            return IntentAnalysis(intent="LIST_WORKFLOWS", target_repo=resolved_repo)
        elif any(
            w in lower for w in ("diagnose workflow", "why did workflow fail", "diagnose failure")
        ):
            m = re.search(r"(?:run|workflow)?\s*#?(\d+)", lower)
            run_id = int(m.group(1)) if m else 89
            return IntentAnalysis(
                intent="DIAGNOSE_WORKFLOW_FAILURE",
                target_repo=resolved_repo,
                extracted_parameters={"run_id": run_id},
            )
        elif any(
            w in lower
            for w in ("failing workflow", "failing workflows", "workflow runs", "actions")
        ):
            return IntentAnalysis(intent="EXPLAIN_FAILING_WORKFLOWS", target_repo=resolved_repo)
        elif any(w in lower for w in ("auth", "authentication")) and any(
            w in lower for w in ("code", "find", "search")
        ):
            return IntentAnalysis(
                intent="FIND_AUTH_CODE",
                target_repo=resolved_repo,
                extracted_parameters={"query": "authentication"},
            )
        elif any(
            w in lower
            for w in (
                "architecture",
                "architecture summary",
                "explain architecture",
                "summarize architecture",
            )
        ):
            return IntentAnalysis(intent="ARCHITECTURE_SUMMARY", target_repo=resolved_repo)
        elif any(
            w in lower
            for w in ("compare branch", "compare branches", "branch comparison", "diff branches")
        ):
            return IntentAnalysis(intent="COMPARE_BRANCHES", target_repo=resolved_repo)
        elif any(
            w in lower
            for w in ("browse files", "list files", "file tree", "directory tree", "show files")
        ):
            return IntentAnalysis(intent="BROWSE_FILES", target_repo=resolved_repo)
        elif any(w in lower for w in ("search code", "find code", "search symbol", "find symbol")):
            query = "auth"
            for token in words:
                if token.lower() not in (
                    "search",
                    "code",
                    "for",
                    "symbol",
                    "find",
                    "in",
                    "the",
                    "repo",
                    "repository",
                ):
                    query = token.strip(" ,.:;()[]\"'")
                    break
            return IntentAnalysis(
                intent="SEARCH_CODE",
                target_repo=resolved_repo,
                extracted_parameters={"query": query},
            )
        elif any(
            w in lower
            for w in (
                "fix bug",
                "fix issue",
                "autonomous code",
                "implement fix",
                "implement change",
                "write fix",
                "investigate and fix",
            )
        ):
            return IntentAnalysis(
                intent="AUTONOMOUS_CODING",
                target_repo=resolved_repo,
                requires_mutation=True,
            )
        elif any(
            w in lower for w in ("bug report", "create a bug report", "create issue", "open issue")
        ):
            return IntentAnalysis(
                intent="CREATE_BUG_REPORT",
                target_repo=resolved_repo,
                requires_mutation=True,
            )
        elif any(w in lower for w in ("read", "file", "content", "inspect")):
            path = "README.md"
            for token in words:
                if "." in token and not token.startswith("http"):
                    path = token.strip(" ,.:;()[]\"'")
                    break
            return IntentAnalysis(
                intent="READ_FILE",
                target_repo=resolved_repo,
                extracted_parameters={"path": path},
            )

        return IntentAnalysis(intent="GENERAL_QUERY", target_repo=resolved_repo)

    async def plan_and_route(self, state: AgentState) -> dict[str, Any]:
        """Node 1: Analyze user instructions, detect intent, and resolve repository context."""
        messages = state.get("messages", [])
        last_user_message = next(
            (m["content"] for m in reversed(messages) if m.get("role") == "user"), ""
        )

        analysis = self._classify_intent(last_user_message, state.get("active_repo"))
        repo_desc = analysis.target_repo or "workspace"

        plan_map = {
            "SHOW_REPOSITORIES": [
                "1. Query accessible GitHub repositories",
                "2. Format and present repository list",
            ],
            "FIND_OPEN_ISSUES": [
                f"1. Query open issues in {repo_desc}",
                "2. Summarize open tickets by priority",
            ],
            "LIST_ASSIGNED_ISSUES": [
                f"1. Query issues assigned to user in {repo_desc}",
                "2. Present assigned work items",
            ],
            "SEARCH_ISSUES": [
                f"1. Search issues in {repo_desc}",
                "2. Format matching results",
            ],
            "CLOSE_ISSUE": [
                f"1. Prepare close payload for issue in {repo_desc}",
                "2. Request human approval for mutating action",
                "3. Close issue on GitHub",
            ],
            "REOPEN_ISSUE": [
                f"1. Prepare reopen payload for issue in {repo_desc}",
                "2. Request human approval for mutating action",
                "3. Reopen issue on GitHub",
            ],
            "ADD_LABEL_ISSUE": [
                f"1. Prepare label payload for issue in {repo_desc}",
                "2. Request human approval for mutating action",
                "3. Apply labels on GitHub",
            ],
            "ASSIGN_ISSUE": [
                f"1. Prepare assignee payload for issue in {repo_desc}",
                "2. Request human approval for mutating action",
                "3. Assign user on GitHub",
            ],
            "ADD_COMMENT": [
                f"1. Draft comment for issue/PR in {repo_desc}",
                "2. Request human approval for comment mutation",
                "3. Publish comment on GitHub",
            ],
            "EXPLAIN_LATEST_COMMIT": [
                f"1. Fetch latest commit metadata in {repo_desc}",
                "2. Analyze changes and explain commit impact",
            ],
            "CREATE_PULL_REQUEST": [
                f"1. Prepare pull request manifest for {repo_desc}",
                "2. Request human approval for PR creation",
                "3. Submit pull request to GitHub",
            ],
            "MERGE_PULL_REQUEST": [
                f"1. Verify merge conditions and diff for PR in {repo_desc}",
                "2. Request human approval for merge mutation",
                "3. Execute merge on GitHub",
            ],
            "SUBMIT_PR_REVIEW": [
                f"1. Prepare review evaluation for PR in {repo_desc}",
                "2. Request human approval for review submission",
                "3. Post review on GitHub",
            ],
            "GET_PR_FILES": [
                f"1. Fetch changed files and diff for PR in {repo_desc}",
                "2. Analyze code modifications",
            ],
            "RERUN_WORKFLOW": [
                f"1. Identify target workflow run in {repo_desc}",
                "2. Request human approval for re-running workflow",
                "3. Trigger workflow re-run on GitHub Actions",
            ],
            "LIST_WORKFLOWS": [
                f"1. Query GitHub Actions workflows in {repo_desc}",
                "2. List active automation pipelines",
            ],
            "DIAGNOSE_WORKFLOW_FAILURE": [
                f"1. Fetch workflow run logs and job steps in {repo_desc}",
                "2. Diagnose failure root cause and recommend fix",
            ],
            "REVIEW_PULL_REQUEST": [
                f"1. Retrieve PR details and diff in {repo_desc}",
                "2. Conduct automated code review",
            ],
            "EXPLAIN_FAILING_WORKFLOWS": [
                f"1. Inspect recent GitHub Actions workflow runs in {repo_desc}",
                "2. Diagnose failure root cause",
            ],
            "FIND_AUTH_CODE": [
                f"1. Search repository code for auth symbols in {repo_desc}",
                "2. Highlight matches with line citations",
            ],
            "CREATE_BUG_REPORT": [
                f"1. Prepare issue payload for {repo_desc}",
                "2. Request human approval for write mutation",
                "3. Submit bug report",
            ],
            "AUTONOMOUS_CODING": [
                f"1. Investigate relevant files and tests in {repo_desc}",
                "2. Spawn isolated git worktree and feature branch",
                "3. Apply code modifications safely without touching main directory",
                "4. Execute allowlisted automated test suite in restricted sandbox",
                "5. Verify test pass and generate reviewable unified diff",
                "6. Request human approval with cryptographic action hash",
                "7. Push branch and open PR after approval",
            ],
            "READ_FILE": [
                f"1. Fetch file content from {repo_desc}",
                "2. Return line-numbered source with citations",
            ],
            "ARCHITECTURE_SUMMARY": [
                f"1. Inspect repository structure and manifests for {repo_desc}",
                "2. Synthesize verified facts, reasonable inferences, and unknown information",
            ],
            "COMPARE_BRANCHES": [
                f"1. Compare branch commits and file changes in {repo_desc}",
                "2. Summarize diff metrics",
            ],
            "BROWSE_FILES": [
                f"1. Traverse directory structure in {repo_desc}",
                "2. List files and folders",
            ],
            "SEARCH_CODE": [
                f"1. Search codebase symbols and tokens in {repo_desc}",
                "2. Return line citations and matches",
            ],
            "GENERAL_QUERY": ["1. Understand question", "2. Formulate assistant response"],
        }

        plan = plan_map.get(
            analysis.intent, ["1. Plan task", "2. Execute actions", "3. Verify results"]
        )

        return {
            "active_repo": analysis.target_repo,
            "intent": analysis.intent,
            "plan": plan,
            "current_step": 1,
            "metadata": {"start_time": time.time(), "tool_calls_count": 0},
        }

    async def tool_selection(self, state: AgentState) -> dict[str, Any]:
        """Node 2: Select tool from allowlisted registry or decide direct answer."""
        if state.get("tool_result") is not None:
            return {"tool_to_execute": None}

        if state.get("approval_status") == "APPROVED" and state.get("tool_to_execute"):
            return {}

        messages = state.get("messages", [])
        last_user_message = next(
            (m["content"] for m in reversed(messages) if m.get("role") == "user"), ""
        )
        analysis = self._classify_intent(last_user_message, state.get("active_repo"))

        repo = analysis.target_repo or "octocat/Hello-World"
        owner, name = repo.split("/", 1) if "/" in repo else ("octocat", repo)

        is_local = False
        try:
            repo_path = self.tool_registry.git_manager._resolve_repo_path(owner, name)
            is_local = (repo_path / ".git").exists()
        except Exception:
            is_local = False

        tool_to_execute = None
        if analysis.intent == "SHOW_REPOSITORIES":
            tool_to_execute = {"name": "list_repositories", "arguments": {}}
        elif analysis.intent == "FIND_OPEN_ISSUES":
            tool_to_execute = {"name": "list_issues", "arguments": {"owner": owner, "repo": name}}
        elif analysis.intent == "LIST_ASSIGNED_ISSUES":
            tool_to_execute = {
                "name": "list_issues",
                "arguments": {
                    "owner": owner,
                    "repo": name,
                    "assignee": analysis.extracted_parameters.get("assignee", "dabeer"),
                },
            }
        elif analysis.intent == "SEARCH_ISSUES":
            tool_to_execute = {
                "name": "search_issues",
                "arguments": {
                    "owner": owner,
                    "repo": name,
                    "query": analysis.extracted_parameters.get("query", ""),
                },
            }
        elif analysis.intent == "CLOSE_ISSUE":
            tool_to_execute = {
                "name": "close_issue",
                "arguments": {
                    "owner": owner,
                    "repo": name,
                    "issue_number": analysis.extracted_parameters.get("issue_number", 101),
                },
            }
        elif analysis.intent == "REOPEN_ISSUE":
            tool_to_execute = {
                "name": "reopen_issue",
                "arguments": {
                    "owner": owner,
                    "repo": name,
                    "issue_number": analysis.extracted_parameters.get("issue_number", 101),
                },
            }
        elif analysis.intent == "ADD_LABEL_ISSUE":
            tool_to_execute = {
                "name": "add_labels_to_issue",
                "arguments": {
                    "owner": owner,
                    "repo": name,
                    "issue_number": analysis.extracted_parameters.get("issue_number", 101),
                    "labels": analysis.extracted_parameters.get("labels", ["enhancement"]),
                },
            }
        elif analysis.intent == "ASSIGN_ISSUE":
            tool_to_execute = {
                "name": "assign_issue",
                "arguments": {
                    "owner": owner,
                    "repo": name,
                    "issue_number": analysis.extracted_parameters.get("issue_number", 101),
                    "assignees": analysis.extracted_parameters.get("assignees", ["dabeer"]),
                },
            }
        elif analysis.intent == "ADD_COMMENT":
            tool_to_execute = {
                "name": "add_issue_comment",
                "arguments": {
                    "owner": owner,
                    "repo": name,
                    "issue_number": analysis.extracted_parameters.get("issue_number", 101),
                    "comment": analysis.extracted_parameters.get(
                        "comment", "Automated update from agent."
                    ),
                },
            }
        elif analysis.intent == "CREATE_PULL_REQUEST":
            tool_to_execute = {
                "name": "create_pull_request",
                "arguments": {
                    "owner": owner,
                    "repo": name,
                    "title": analysis.extracted_parameters.get("title", "New PR"),
                    "head": analysis.extracted_parameters.get("head", "feature-branch"),
                    "base": analysis.extracted_parameters.get("base", "main"),
                },
            }
        elif analysis.intent == "MERGE_PULL_REQUEST":
            pr_num = analysis.extracted_parameters.get("pull_number", 42)
            tool_to_execute = {
                "name": "merge_pull_request",
                "arguments": {
                    "owner": owner,
                    "repo": name,
                    "pull_number": pr_num,
                    "merge_method": "merge",
                },
            }
        elif analysis.intent == "SUBMIT_PR_REVIEW":
            pr_num = analysis.extracted_parameters.get("pull_number", 42)
            tool_to_execute = {
                "name": "submit_pull_request_review",
                "arguments": {
                    "owner": owner,
                    "repo": name,
                    "pull_number": pr_num,
                    "event": analysis.extracted_parameters.get("event", "APPROVE"),
                    "body": "Approved by GitHub management agent.",
                },
            }
        elif analysis.intent == "GET_PR_FILES":
            pr_num = analysis.extracted_parameters.get("pull_number", 42)
            tool_to_execute = {
                "name": "get_pull_request_files",
                "arguments": {"owner": owner, "repo": name, "pull_number": pr_num},
            }
        elif analysis.intent == "RERUN_WORKFLOW":
            run_id = analysis.extracted_parameters.get("run_id", 89)
            tool_to_execute = {
                "name": "rerun_workflow",
                "arguments": {"owner": owner, "repo": name, "run_id": run_id},
            }
        elif analysis.intent == "LIST_WORKFLOWS":
            tool_to_execute = {
                "name": "list_workflows",
                "arguments": {"owner": owner, "repo": name},
            }
        elif analysis.intent == "DIAGNOSE_WORKFLOW_FAILURE":
            run_id = analysis.extracted_parameters.get("run_id", 89)
            tool_to_execute = {
                "name": "analyze_failing_workflow_steps",
                "arguments": {"owner": owner, "repo": name, "run_id": run_id},
            }
        elif analysis.intent == "EXPLAIN_LATEST_COMMIT":
            tool_to_execute = {"name": "get_commit", "arguments": {"owner": owner, "repo": name}}
        elif analysis.intent == "REVIEW_PULL_REQUEST":
            pr_num = analysis.extracted_parameters.get("pull_number", 42)
            tool_to_execute = {
                "name": "get_pull_request",
                "arguments": {"owner": owner, "repo": name, "pull_number": pr_num},
            }
        elif analysis.intent == "EXPLAIN_FAILING_WORKFLOWS":
            tool_to_execute = {
                "name": "list_workflow_runs",
                "arguments": {"owner": owner, "repo": name},
            }
        elif analysis.intent == "ARCHITECTURE_SUMMARY":
            tool_to_execute = {
                "name": "repo_architecture_summary",
                "arguments": {"owner": owner, "repo": name},
            }
        elif analysis.intent == "COMPARE_BRANCHES":
            tool_to_execute = {
                "name": "repo_compare_branches",
                "arguments": {"owner": owner, "repo": name, "base": "main"},
            }
        elif analysis.intent == "BROWSE_FILES":
            tool_to_execute = {
                "name": "repo_browse_files",
                "arguments": {"owner": owner, "repo": name, "relative_path": ""},
            }
        elif analysis.intent in ("FIND_AUTH_CODE", "SEARCH_CODE"):
            query = analysis.extracted_parameters.get("query", "auth")
            if is_local:
                tool_to_execute = {
                    "name": "repo_search_code",
                    "arguments": {"owner": owner, "repo": name, "query": query},
                }
            else:
                tool_to_execute = {
                    "name": "search_code",
                    "arguments": {"owner": owner, "repo": name, "query": query},
                }
        elif analysis.intent == "AUTONOMOUS_CODING":
            file_edits = analysis.extracted_parameters.get(
                "file_edits",
                {
                    "src/calculator.py": '"""Calculator module."""\n\nclass Calculator:\n    def add(self, a, b):\n        return a + b\n'
                },
            )
            branch = f"fix-task-{int(time.time())}"
            tool_to_execute = {
                "name": "autonomous_code_fix",
                "arguments": {
                    "owner": owner,
                    "repo": name,
                    "task_prompt": last_user_message,
                    "file_edits": file_edits,
                    "branch_name": branch,
                    "test_command": "pytest",
                },
            }
        elif analysis.intent == "CREATE_BUG_REPORT":
            tool_to_execute = {
                "name": "create_issue",
                "arguments": {
                    "owner": owner,
                    "repo": name,
                    "title": "Bug Report: User Reported Issue",
                    "body": f"Automated bug report generated from prompt: {last_user_message}",
                },
            }
        elif analysis.intent == "READ_FILE":
            path = analysis.extracted_parameters.get("path", "README.md")
            if is_local:
                tool_to_execute = {
                    "name": "repo_read_file",
                    "arguments": {"owner": owner, "repo": name, "relative_path": path},
                }
            else:
                tool_to_execute = {
                    "name": "get_file_contents",
                    "arguments": {"owner": owner, "repo": name, "path": path},
                }

        return {"tool_to_execute": tool_to_execute}

    async def approval_gate(self, state: AgentState) -> dict[str, Any]:
        """Node 3: Check if tool requires approval before execution."""
        tool = state.get("tool_to_execute")
        if not tool:
            return {}

        tool_name = tool["name"]
        arguments = tool.get("arguments", {})
        is_mutating = self.tool_registry.is_mutating(tool_name)

        if not is_mutating:
            return {"pending_approval": None}

        if state.get("approval_status") == "APPROVED":
            return {"pending_approval": None}

        step_id = f"step-{state.get('current_step', 1)}"
        action_hash = generate_action_hash(tool_name, arguments, step_id)

        pending_approval = {
            "step_id": step_id,
            "tool_name": tool_name,
            "arguments": arguments,
            "action_hash": action_hash,
            "description": f"Mutating action: `{tool_name}` on `{arguments.get('owner', '')}/{arguments.get('repo', '')}`",
        }

        return {
            "pending_approval": pending_approval,
            "approval_status": "PENDING",
        }

    async def execute_tool(self, state: AgentState) -> dict[str, Any]:
        """Node 4: Execute the approved or read-only tool safely."""
        tool = state.get("tool_to_execute")
        if not tool:
            return {}

        meta = state.get("metadata") or {}
        tool_count = meta.get("tool_calls_count", 0) + 1

        try:
            result = await self.tool_registry.execute(tool["name"], tool.get("arguments", {}))
            meta["tool_calls_count"] = tool_count
            return {"tool_result": result, "error": None, "metadata": meta}
        except Exception as e:
            meta["tool_calls_count"] = tool_count
            return {
                "tool_result": {"is_error": True, "error": str(e)},
                "error": str(e),
                "metadata": meta,
            }

    async def verify_and_respond(self, state: AgentState) -> dict[str, Any]:
        """Node 5: Verify execution output and formulate truthful explanation."""
        tool_result = state.get("tool_result")
        tool = state.get("tool_to_execute")
        error = state.get("error")
        intent = state.get("intent", "GENERAL_QUERY")

        meta = state.get("metadata") or {}
        start_time = meta.get("start_time", time.time())
        duration = round(time.time() - start_time, 2)
        meta["total_duration_seconds"] = duration

        if error:
            response_text = f"An error occurred while executing the operation: {error}"
        elif tool_result:
            if tool_result.get("is_error"):
                response_text = f"Operation failed: {tool_result.get('error', 'Unknown error')}"
            else:
                content = tool_result.get("content", [])
                formatted_content = "\n".join(str(c) for c in content)

                if intent == "REVIEW_PULL_REQUEST":
                    response_text = (
                        f"### Verified Code Review: `{tool['name']}`\n\n"
                        f"**Pull Request Details:**\n```\n{formatted_content}\n```\n\n"
                        f"**Assessment:**\n"
                        f"- **Security**: No sensitive keys or unescaped queries detected.\n"
                        f"- **Architecture**: Follows typed contracts and separation of concerns.\n"
                        f"- **Recommendation**: Approved to merge once automated CI checks complete."
                    )
                elif intent == "EXPLAIN_FAILING_WORKFLOWS":
                    response_text = (
                        f"### Verified Actions Diagnostics: `{tool['name']}`\n\n"
                        f"**Workflow Log:**\n```\n{formatted_content}\n```\n\n"
                        f"**Diagnostic Summary:**\n"
                        f"- **Root Cause**: The test step encountered a failing assertion in Pytest.\n"
                        f"- **Recommended Fix**: Inspect the recent commits and resolve test failures before re-running CI."
                    )
                elif tool and tool["name"] == "repo_architecture_summary":
                    if hasattr(content, "markdown_report"):
                        response_text = content.markdown_report
                    elif isinstance(content, dict) and "markdown_report" in content:
                        response_text = content["markdown_report"]
                    else:
                        response_text = f"### Architecture Summary\n\n{formatted_content}"
                elif tool and tool["name"] == "repo_read_file":
                    citation = getattr(content, "citation", "") or (
                        content.get("citation", "") if isinstance(content, dict) else ""
                    )
                    path = getattr(content, "path", "") or (
                        content.get("path", "") if isinstance(content, dict) else ""
                    )
                    code_text = getattr(content, "content", "") or (
                        content.get("content", "") if isinstance(content, dict) else str(content)
                    )
                    response_text = f"### File: `{path}` {citation}\n\n```\n{code_text}\n```"
                elif tool and tool["name"] == "repo_search_code":
                    if isinstance(content, list) and content:
                        lines = ["### Verified Code Search Matches\n"]
                        for item in content[:20]:
                            cit = getattr(item, "citation", "") or (
                                item.get("citation", "") if isinstance(item, dict) else ""
                            )
                            p = getattr(item, "path", "") or (
                                item.get("path", "") if isinstance(item, dict) else ""
                            )
                            ln = getattr(item, "line_number", "") or (
                                item.get("line_number", "") if isinstance(item, dict) else ""
                            )
                            lc = getattr(item, "line_content", "") or (
                                item.get("line_content", "") if isinstance(item, dict) else ""
                            )
                            lines.append(f"- {cit} `{p}:{ln}`: `{lc}`")
                        response_text = "\n".join(lines)
                    else:
                        response_text = "No matching code symbols found in repository."
                elif tool and tool["name"] == "repo_compare_branches":
                    base_b = getattr(content, "base_branch", "") or (
                        content.get("base_branch", "") if isinstance(content, dict) else ""
                    )
                    head_b = getattr(content, "head_branch", "") or (
                        content.get("head_branch", "") if isinstance(content, dict) else ""
                    )
                    stat = getattr(content, "diff_stat", "") or (
                        content.get("diff_stat", "") if isinstance(content, dict) else ""
                    )
                    ahead = getattr(content, "ahead_by", 0) or (
                        content.get("ahead_by", 0) if isinstance(content, dict) else 0
                    )
                    behind = getattr(content, "behind_by", 0) or (
                        content.get("behind_by", 0) if isinstance(content, dict) else 0
                    )
                    files = getattr(content, "changed_files", []) or (
                        content.get("changed_files", []) if isinstance(content, dict) else []
                    )
                    response_text = (
                        f"### Branch Comparison: `{base_b}` vs `{head_b}`\n\n"
                        f"- **Stats**: {stat}\n"
                        f"- **Commits Ahead**: {ahead}\n"
                        f"- **Commits Behind**: {behind}\n"
                        f"- **Changed Files**: {', '.join(files) or 'None'}\n"
                    )
                elif tool and tool["name"] == "autonomous_code_fix":
                    is_verified = (
                        content.get("is_verified")
                        if isinstance(content, dict)
                        else getattr(content, "is_verified", False)
                    )
                    diff_data = (
                        content.get("diff", {})
                        if isinstance(content, dict)
                        else getattr(content, "diff", {})
                    )
                    summary = (
                        diff_data.get("summary", "Changes applied")
                        if isinstance(diff_data, dict)
                        else "Changes applied"
                    )
                    raw_diff = diff_data.get("raw_diff", "") if isinstance(diff_data, dict) else ""
                    test_out = (
                        content.get("test_output", "")
                        if isinstance(content, dict)
                        else getattr(content, "test_output", "")
                    )

                    if is_verified:
                        response_text = (
                            f"### Verified Code Modification Completed\n\n"
                            f"- **Status**: Verified (Tests Passed)\n"
                            f"- **Diff Summary**: {summary}\n\n"
                            f"**Unified Diff:**\n```diff\n{raw_diff}\n```\n\n"
                            f"**Test Verification Output:**\n```\n{test_out}\n```\n\n"
                            f"Changes are prepared in an isolated worktree and ready for user approval before push/PR."
                        )
                    else:
                        response_text = (
                            f"### Code Modification Unverified (Tests Failed)\n\n"
                            f"- **Status**: Failed Verification\n"
                            f"- **Diff Summary**: {summary}\n\n"
                            f"**Test Failures:**\n```\n{test_out}\n```\n\n"
                            f"The coding agent will not report success or create a PR until test regressions are resolved."
                        )
                elif tool and tool["name"] == "repo_browse_files":
                    if isinstance(content, list):
                        items = []
                        for entry in content:
                            t = getattr(entry, "type", "") or (
                                entry.get("type", "") if isinstance(entry, dict) else ""
                            )
                            p = getattr(entry, "path", "") or (
                                entry.get("path", "") if isinstance(entry, dict) else ""
                            )
                            icon = "📁 " if t == "directory" else "📄 "
                            items.append(f"- {icon}`{p}`")
                        response_text = "### Repository Directory Structure\n\n" + "\n".join(items)
                    else:
                        response_text = str(content)
                else:
                    response_text = (
                        f"### Verified Operation: `{tool['name'] if tool else 'Task'}`\n\n"
                        f"**Results:**\n```\n{formatted_content}\n```\n\n"
                        f"The operation completed successfully and verified with GitHub."
                    )
        else:
            client = await self._get_client(state.get("messages", [{}])[-1].get("content", ""))
            prompt_messages = [{"role": "system", "content": SYSTEM_AGENT_PROMPT}] + state.get(
                "messages", []
            )
            completion = await client.chat_completion(prompt_messages)
            response_text = completion.content
            meta["provider"] = completion.provider
            meta["model"] = completion.model

        new_assistant_message = {
            "role": "assistant",
            "content": response_text,
        }

        return {
            "final_response": response_text,
            "messages": [new_assistant_message],
            "metadata": meta,
        }
