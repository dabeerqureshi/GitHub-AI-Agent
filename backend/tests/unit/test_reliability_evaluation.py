"""Unit tests for Reliability Evaluation Benchmark Runner."""

import pytest

from app.evaluation.dataset import BENCHMARK_DATASET
from app.evaluation.runner import EvaluationRunner


@pytest.mark.asyncio
async def test_reliability_evaluation_benchmark():
    """Verify tool selection accuracy, repo reference accuracy, and approval compliance across evaluation dataset."""
    runner = EvaluationRunner()
    metrics = await runner.run_benchmark(BENCHMARK_DATASET)

    print("\n--- EVALUATION SCORECARD ---")
    print(f"Total Cases Evaluated: {metrics.total_cases_evaluated}")
    print(f"Tool Selection Accuracy: {metrics.tool_selection_accuracy}%")
    print(f"Repository Reference Accuracy: {metrics.repository_reference_accuracy}%")
    print(f"Approval Policy Compliance: {metrics.approval_policy_compliance}%")
    print(f"Task Completion Rate: {metrics.task_completion_rate}%")
    print(f"Invalid Action Rate: {metrics.invalid_action_rate}%")
    print(f"Overall Autonomy Readiness Score: {metrics.overall_readiness_score}%")
    if metrics.failures:
        print(f"Failures: {metrics.failures}")

    # Core reliability criteria
    assert metrics.total_cases_evaluated == len(BENCHMARK_DATASET)
    assert metrics.tool_selection_accuracy >= 90.0
    assert metrics.repository_reference_accuracy >= 90.0
    assert metrics.approval_policy_compliance == 100.0
    assert metrics.invalid_action_rate == 0.0
    assert metrics.task_completion_rate >= 90.0
    assert metrics.overall_readiness_score >= 85.0
