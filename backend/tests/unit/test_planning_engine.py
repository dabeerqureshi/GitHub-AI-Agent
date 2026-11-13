"""Unit tests for Planning Engine: Task Decomposition, Dependencies, and Execution Limits."""

import pytest

from app.agent.planning_engine import (
    ExecutionLimitViolationException,
    ExecutionPlan,
    PlanningEngine,
    PlanningLimits,
)
from app.agent.specialized_roles import PlanStep, SpecializedRole


def test_task_decomposition_for_advanced_workflows():
    plan = PlanningEngine.decompose_task(
        intent="ANALYZE_REPOSITORY",
        goal="Analyze repository architecture",
        target_repo="facebook/react",
    )
    assert len(plan.steps) == 2
    assert plan.steps[0].agent_role == SpecializedRole.REPOSITORY_ANALYST
    assert plan.steps[1].depends_on == ["step-1"]


def test_dependency_resolution():
    step1 = PlanStep(
        id="s1",
        description="Clone repo",
        agent_role=SpecializedRole.GIT_OPERATIONS,
    )
    step2 = PlanStep(
        id="s2",
        description="Apply patch",
        agent_role=SpecializedRole.CODING_AGENT,
        depends_on=["s1"],
    )
    plan = ExecutionPlan(goal="Fix bug", steps=[step1, step2])

    # First runnable step is s1
    next_step = plan.get_next_runnable_step()
    assert next_step is not None
    assert next_step.id == "s1"

    # s1 in progress
    plan.mark_step_in_progress("s1")
    # No pending step ready yet
    assert plan.get_next_runnable_step() is None

    # Complete s1
    plan.mark_step_completed("s1", summary="Clone complete")

    # Now s2 dependency is satisfied
    next_step2 = plan.get_next_runnable_step()
    assert next_step2 is not None
    assert next_step2.id == "s2"


def test_execution_limits_enforcement():
    plan = ExecutionPlan(
        goal="Loop test",
        steps=[
            PlanStep(id=f"step-{i}", description="task", agent_role=SpecializedRole.CODING_AGENT)
            for i in range(12)
        ],
        limits=PlanningLimits(max_steps=5, max_tool_calls=3),
    )

    # Tool calls budget check
    plan.record_tool_call()
    plan.record_tool_call()
    plan.record_tool_call()
    with pytest.raises(ExecutionLimitViolationException, match="Maximum tool calls limit"):
        plan.record_tool_call()

    # Steps budget check
    plan.current_step_index = 5
    with pytest.raises(ExecutionLimitViolationException, match="Maximum steps limit"):
        plan.get_next_runnable_step()


def test_failure_recovery_and_approval_checkpointing():
    step_read = PlanStep(
        id="s1",
        description="Read file",
        agent_role=SpecializedRole.REPOSITORY_ANALYST,
    )
    step_mutate = PlanStep(
        id="s2",
        description="Push commit",
        agent_role=SpecializedRole.GIT_OPERATIONS,
        depends_on=["s1"],
        requires_approval=True,
    )
    plan = ExecutionPlan(goal="Push feature", steps=[step_read, step_mutate])

    plan.mark_step_completed("s1")
    runnable = plan.get_next_runnable_step()
    assert runnable.requires_approval is True

    plan.mark_step_waiting_approval("s2")
    assert plan.is_paused_for_approval is True

    # Mark failure
    plan.mark_step_failed("s2", error="Network timeout to remote GitHub host")
    assert plan.failure_reason is not None
    assert "Network timeout" in plan.failure_reason
