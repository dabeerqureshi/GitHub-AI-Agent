"""Planning Engine for multi-step task decomposition, dependencies, and execution limits."""

from typing import Any

from pydantic import BaseModel, Field

from app.agent.specialized_roles import PlanStep, SpecializedRole


class ExecutionLimitViolationException(Exception):
    """Raised when plan execution exceeds configured step or tool limits."""

    pass


class PlanningLimits(BaseModel):
    """Execution boundaries preventing infinite loops or excessive tool execution."""

    max_steps: int = Field(10, description="Maximum number of sequential steps allowed")
    max_tool_calls: int = Field(15, description="Maximum total tool executions allowed")
    max_retries_per_step: int = Field(2, description="Maximum retries per failed step")


class ExecutionPlan(BaseModel):
    """A full multi-step execution plan with dependencies and progress tracking."""

    goal: str
    target_repo: str | None = None
    steps: list[PlanStep] = Field(default_factory=list)
    limits: PlanningLimits = Field(default_factory=PlanningLimits)
    current_step_index: int = 0
    total_tool_calls: int = 0
    is_completed: bool = False
    is_paused_for_approval: bool = False
    failure_reason: str | None = None

    def get_step(self, step_id: str) -> PlanStep | None:
        """Find step by ID."""
        for s in self.steps:
            if s.id == step_id:
                return s
        return None

    def get_next_runnable_step(self) -> PlanStep | None:
        """Return the next step whose dependencies are all COMPLETED."""
        if self.current_step_index >= self.limits.max_steps:
            raise ExecutionLimitViolationException(
                f"Maximum steps limit ({self.limits.max_steps}) exceeded."
            )

        for step in self.steps:
            if step.status == "PENDING":
                # Check all dependencies
                deps_satisfied = True
                for dep_id in step.depends_on:
                    dep_step = self.get_step(dep_id)
                    if not dep_step or dep_step.status != "COMPLETED":
                        deps_satisfied = False
                        break
                if deps_satisfied:
                    return step
        return None

    def mark_step_in_progress(self, step_id: str) -> None:
        """Transition step to IN_PROGRESS."""
        step = self.get_step(step_id)
        if step:
            step.status = "IN_PROGRESS"

    def mark_step_completed(self, step_id: str, summary: str | None = None) -> None:
        """Mark step as completed and check if entire plan is completed."""
        step = self.get_step(step_id)
        if step:
            step.status = "COMPLETED"
            step.result_summary = summary
            self.current_step_index += 1

        # Check if all steps are completed
        if all(s.status == "COMPLETED" for s in self.steps):
            self.is_completed = True

    def mark_step_waiting_approval(self, step_id: str) -> None:
        """Pause plan at step requiring human approval."""
        step = self.get_step(step_id)
        if step:
            step.status = "WAITING_APPROVAL"
            self.is_paused_for_approval = True

    def mark_step_failed(self, step_id: str, error: str) -> None:
        """Mark step as failed with diagnostic details."""
        step = self.get_step(step_id)
        if step:
            step.status = "FAILED"
            step.result_summary = f"Failure: {error}"
            self.failure_reason = f"Step {step_id} failed: {error}"

    def record_tool_call(self) -> None:
        """Increment and enforce tool call budget."""
        self.total_tool_calls += 1
        if self.total_tool_calls > self.limits.max_tool_calls:
            raise ExecutionLimitViolationException(
                f"Maximum tool calls limit ({self.limits.max_tool_calls}) exceeded."
            )


class PlanningEngine:
    """Decomposes complex requests into structured execution plans across specialized agent roles."""

    @staticmethod
    def decompose_task(
        intent: str,
        goal: str,
        target_repo: str | None = None,
        extracted_params: dict[str, Any] | None = None,
    ) -> ExecutionPlan:
        """Decompose a high-level intent into sequential, dependent plan steps."""
        params = extracted_params or {}
        steps: list[PlanStep] = []

        if intent == "ANALYZE_REPOSITORY":
            steps = [
                PlanStep(
                    id="step-1",
                    description=f"Inspect repository structure, languages and dependencies for {target_repo}",
                    agent_role=SpecializedRole.REPOSITORY_ANALYST,
                    tool_name="get_repo_context",
                    parameters={
                        "owner": target_repo.split("/")[0] if target_repo else "",
                        "repo": target_repo.split("/")[1] if target_repo else "",
                    },
                ),
                PlanStep(
                    id="step-2",
                    description="Synthesize comprehensive architectural overview and subsystem summary",
                    agent_role=SpecializedRole.REPOSITORY_ANALYST,
                    depends_on=["step-1"],
                    tool_name="get_architecture_summary",
                    parameters={
                        "owner": target_repo.split("/")[0] if target_repo else "",
                        "repo": target_repo.split("/")[1] if target_repo else "",
                    },
                ),
            ]

        elif intent == "IDENTIFY_TECH_DEBT":
            steps = [
                PlanStep(
                    id="step-1",
                    description=f"Scan repository symbols, dependency manifests, and file sizes for {target_repo}",
                    agent_role=SpecializedRole.REPOSITORY_ANALYST,
                    tool_name="browse_repository_files",
                    parameters={
                        "owner": target_repo.split("/")[0] if target_repo else "",
                        "repo": target_repo.split("/")[1] if target_repo else "",
                    },
                ),
                PlanStep(
                    id="step-2",
                    description="Evaluate code complexity, outdated dependencies, and architectural smells",
                    agent_role=SpecializedRole.REPOSITORY_ANALYST,
                    depends_on=["step-1"],
                    tool_name="identify_tech_debt",
                    parameters={
                        "owner": target_repo.split("/")[0] if target_repo else "",
                        "repo": target_repo.split("/")[1] if target_repo else "",
                    },
                ),
            ]

        elif intent == "FIND_CODE_DUPLICATION":
            steps = [
                PlanStep(
                    id="step-1",
                    description=f"Extract symbols and search recurring patterns across modules in {target_repo}",
                    agent_role=SpecializedRole.REPOSITORY_ANALYST,
                    tool_name="find_code_duplication",
                    parameters={
                        "owner": target_repo.split("/")[0] if target_repo else "",
                        "repo": target_repo.split("/")[1] if target_repo else "",
                    },
                ),
            ]

        elif intent == "INVESTIGATE_PRODUCTION_BUG":
            steps = [
                PlanStep(
                    id="step-1",
                    description="Analyze bug symptoms and map stack traces to source files",
                    agent_role=SpecializedRole.CODING_AGENT,
                    tool_name="investigate_production_bug",
                    parameters={
                        "owner": target_repo.split("/")[0] if target_repo else "",
                        "repo": target_repo.split("/")[1] if target_repo else "",
                        "bug_description": goal,
                    },
                ),
                PlanStep(
                    id="step-2",
                    description="Locate relevant unit tests and form an isolated reproduction plan",
                    agent_role=SpecializedRole.CODING_AGENT,
                    depends_on=["step-1"],
                ),
            ]

        elif intent == "ANALYZE_COMMIT_REGRESSIONS":
            steps = [
                PlanStep(
                    id="step-1",
                    description=f"Inspect recent commit history and diffs on default branch in {target_repo}",
                    agent_role=SpecializedRole.GIT_OPERATIONS,
                    tool_name="analyze_commit_regressions",
                    parameters={
                        "owner": target_repo.split("/")[0] if target_repo else "",
                        "repo": target_repo.split("/")[1] if target_repo else "",
                        "limit": 10,
                    },
                ),
            ]

        elif intent == "COMPARE_BRANCHES_ADVANCED":
            base = params.get("base", "main")
            head = params.get("head", "feature")
            steps = [
                PlanStep(
                    id="step-1",
                    description=f"Compare branch divergence between '{base}' and '{head}' in {target_repo}",
                    agent_role=SpecializedRole.GIT_OPERATIONS,
                    tool_name="compare_repository_branches",
                    parameters={
                        "owner": target_repo.split("/")[0] if target_repo else "",
                        "repo": target_repo.split("/")[1] if target_repo else "",
                        "base": base,
                        "head": head,
                    },
                ),
            ]

        elif intent == "BATCH_REVIEW_PRS":
            steps = [
                PlanStep(
                    id="step-1",
                    description=f"Fetch and triage all open pull requests for {target_repo}",
                    agent_role=SpecializedRole.PR_REVIEWER,
                    tool_name="batch_review_prs",
                    parameters={
                        "owner": target_repo.split("/")[0] if target_repo else "",
                        "repo": target_repo.split("/")[1] if target_repo else "",
                    },
                ),
            ]

        elif intent == "DIAGNOSE_CI_FAILURES":
            steps = [
                PlanStep(
                    id="step-1",
                    description=f"Retrieve failing GitHub Actions workflow runs and logs for {target_repo}",
                    agent_role=SpecializedRole.ACTIONS_ANALYST,
                    tool_name="diagnose_ci_failures",
                    parameters={
                        "owner": target_repo.split("/")[0] if target_repo else "",
                        "repo": target_repo.split("/")[1] if target_repo else "",
                    },
                ),
            ]

        elif intent == "GENERATE_DEV_PLAN":
            steps = [
                PlanStep(
                    id="step-1",
                    description=f"Examine codebase structure and dependencies for planning {goal}",
                    agent_role=SpecializedRole.REPOSITORY_ANALYST,
                    tool_name="generate_development_plan",
                    parameters={
                        "owner": target_repo.split("/")[0] if target_repo else "",
                        "repo": target_repo.split("/")[1] if target_repo else "",
                        "feature_goal": goal,
                    },
                ),
            ]

        elif intent == "MULTI_FILE_FEATURE_IMPLEMENTATION":
            steps = [
                PlanStep(
                    id="step-1",
                    description="Investigate symbols and affected modules across repository",
                    agent_role=SpecializedRole.CODING_AGENT,
                    tool_name="coding_investigate",
                    parameters={
                        "owner": target_repo.split("/")[0] if target_repo else "",
                        "repo": target_repo.split("/")[1] if target_repo else "",
                        "task_prompt": goal,
                    },
                ),
                PlanStep(
                    id="step-2",
                    description="Create isolated worktree and implement changes across multiple files",
                    agent_role=SpecializedRole.CODING_AGENT,
                    depends_on=["step-1"],
                    requires_approval=True,
                    tool_name="autonomous_code_fix",
                    parameters={
                        "owner": target_repo.split("/")[0] if target_repo else "",
                        "repo": target_repo.split("/")[1] if target_repo else "",
                        "task_prompt": goal,
                    },
                ),
            ]

        elif intent == "GENERATE_TESTS_FOR_CODE":
            steps = [
                PlanStep(
                    id="step-1",
                    description=f"Inspect module to extract signatures and test cases for {target_repo}",
                    agent_role=SpecializedRole.CODING_AGENT,
                    tool_name="generate_tests_for_code",
                    parameters={
                        "owner": target_repo.split("/")[0] if target_repo else "",
                        "repo": target_repo.split("/")[1] if target_repo else "",
                        "target_file": params.get("target_file", ""),
                    },
                ),
            ]

        elif intent == "PREPARE_RELEASE_SUMMARY":
            steps = [
                PlanStep(
                    id="step-1",
                    description=f"Gather merged PRs and commit history to compile release summary for {target_repo}",
                    agent_role=SpecializedRole.ISSUE_MANAGER,
                    tool_name="prepare_release_summary",
                    parameters={
                        "owner": target_repo.split("/")[0] if target_repo else "",
                        "repo": target_repo.split("/")[1] if target_repo else "",
                    },
                ),
            ]

        else:
            # Fallback single step
            steps = [
                PlanStep(
                    id="step-1",
                    description=f"Execute: {goal}",
                    agent_role=SpecializedRole.REPOSITORY_ANALYST,
                )
            ]

        return ExecutionPlan(
            goal=goal,
            target_repo=target_repo,
            steps=steps,
        )
