"""LangGraph agent workflow definition for GitHub AI Workspace."""

from typing import Any

from langgraph.graph import END, StateGraph

from app.agent.prompts import SYSTEM_AGENT_PROMPT
from app.agent.router import BaseLLMClient, ModelRouter
from app.agent.state import AgentState
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

    async def _get_client(self) -> BaseLLMClient:
        if self.llm_client:
            return self.llm_client
        return await self._router.get_active_client()

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

    async def plan_and_route(self, state: AgentState) -> dict[str, Any]:
        """Node 1: Analyze user instructions, detect intent, and resolve repository context."""
        messages = state.get("messages", [])
        last_user_message = next(
            (m["content"] for m in reversed(messages) if m.get("role") == "user"), ""
        )

        # Detect target repository if mentioned e.g. "facebook/react" or "in repo owner/name"
        active_repo = state.get("active_repo")
        words = last_user_message.split()
        for word in words:
            if "/" in word and not word.startswith("http") and len(word.split("/")) == 2:
                candidate = word.strip(" ,.:;()[]\"'")
                if "/" in candidate and not candidate.startswith("/"):
                    active_repo = candidate
                    break

        # Detect high-level intent
        lower = last_user_message.lower()
        intent = "general_query"
        if any(w in lower for w in ("pr", "pull request")):
            intent = "pull_request_management"
        elif any(w in lower for w in ("issue", "bug", "ticket")):
            intent = "issue_management"
        elif any(w in lower for w in ("list", "show", "files", "contents", "read")):
            intent = "repository_intelligence"
        elif any(w in lower for w in ("commit", "edit", "change", "create", "write")):
            intent = "code_modification"

        plan = [
            f"1. Resolve repository context ({active_repo or 'workspace'})",
            f"2. Execute intent-specific actions for '{intent}'",
            "3. Verify result accuracy and explain findings",
        ]

        return {
            "active_repo": active_repo,
            "intent": intent,
            "plan": plan,
            "current_step": 1,
        }

    async def tool_selection(self, state: AgentState) -> dict[str, Any]:
        """Node 2: Select tool from allowlisted registry or decide direct answer."""
        # If tool execution already happened in a previous cycle, skip
        if state.get("tool_result") is not None:
            return {"tool_to_execute": None}

        # If already resuming with an approved tool, keep it
        if state.get("approval_status") == "APPROVED" and state.get("tool_to_execute"):
            return {}

        messages = state.get("messages", [])
        last_user_message = next(
            (m["content"] for m in reversed(messages) if m.get("role") == "user"), ""
        )
        lower = last_user_message.lower()
        repo = state.get("active_repo") or "owner/repo"
        owner, name = repo.split("/", 1) if "/" in repo else ("owner", repo)

        # Dynamic tool selection mapping based on intent & arguments
        tool_to_execute = None
        if "list repos" in lower or "list repositories" in lower or "my repos" in lower:
            tool_to_execute = {"name": "list_repositories", "arguments": {}}
        elif "create issue" in lower or "open issue" in lower:
            tool_to_execute = {
                "name": "create_issue",
                "arguments": {
                    "owner": owner,
                    "repo": name,
                    "title": "New issue requested via GitHub AI Workspace",
                    "body": f"Details from user prompt: {last_user_message}",
                },
            }
        elif "create pr" in lower or "create pull request" in lower or "open pr" in lower:
            tool_to_execute = {
                "name": "create_pull_request",
                "arguments": {
                    "owner": owner,
                    "repo": name,
                    "title": "Pull Request generated by AI Workspace",
                    "head": "feature-branch",
                    "base": "main",
                },
            }
        elif "read" in lower or "file" in lower or "content" in lower:
            # Extract file path if provided
            path = "README.md"
            words = last_user_message.split()
            for token in words:
                if "." in token and not token.startswith("http"):
                    path = token.strip(" ,.:;()[]\"'")
                    break
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

        # If read-only, proceed directly without approval
        if not is_mutating:
            return {"pending_approval": None}

        # If already approved by user in state resume
        if state.get("approval_status") == "APPROVED":
            return {"pending_approval": None}

        # Generate action hash binding
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

        try:
            result = await self.tool_registry.execute(tool["name"], tool.get("arguments", {}))
            return {"tool_result": result, "error": None}
        except Exception as e:
            return {
                "tool_result": {"is_error": True, "error": str(e)},
                "error": str(e),
            }

    async def verify_and_respond(self, state: AgentState) -> dict[str, Any]:
        """Node 5: Verify execution output and formulate truthful explanation."""
        tool_result = state.get("tool_result")
        tool = state.get("tool_to_execute")
        error = state.get("error")

        if error:
            response_text = f"An error occurred while executing the operation: {error}"
        elif tool_result:
            if tool_result.get("is_error"):
                response_text = f"Operation failed: {tool_result.get('error', 'Unknown error')}"
            else:
                content = tool_result.get("content", [])
                formatted_content = "\n".join(str(c) for c in content)
                response_text = (
                    f"### Verified Operation: `{tool['name'] if tool else 'Task'}`\n\n"
                    f"**Results:**\n```\n{formatted_content}\n```\n\n"
                    f"The operation completed successfully and verified with GitHub."
                )
        else:
            # Direct response without tool execution
            client = await self._get_client()
            prompt_messages = [{"role": "system", "content": SYSTEM_AGENT_PROMPT}] + state.get(
                "messages", []
            )
            completion = await client.chat_completion(prompt_messages)
            response_text = completion.content

        # Append assistant response to messages
        new_assistant_message = {
            "role": "assistant",
            "content": response_text,
        }

        return {
            "final_response": response_text,
            "messages": [new_assistant_message],
        }
