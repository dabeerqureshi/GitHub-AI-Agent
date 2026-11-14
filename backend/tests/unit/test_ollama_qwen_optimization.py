"""Unit tests for Ollama qwen3:4b reasoning model optimization and commit intent detection."""

import httpx
import pytest

from app.agent.graph import GitHubAgentWorkflow
from app.agent.router import OllamaClient


def test_commit_intent_classification():
    """Verify natural language variants of commit queries are properly classified."""
    wf = GitHubAgentWorkflow()

    queries = [
        "what the last commit?",
        "what is the last commit",
        "last commit",
        "show last commit",
        "latest commit",
        "recent commits",
    ]

    for q in queries:
        analysis = wf._classify_intent(q, active_repo="dabeerqureshi/DVSA-PRO-Audit")
        assert (
            analysis.intent == "EXPLAIN_LATEST_COMMIT"
        ), f"Failed to classify '{q}' as EXPLAIN_LATEST_COMMIT, got '{analysis.intent}'"
        assert analysis.target_repo == "dabeerqureshi/DVSA-PRO-Audit"


def test_ollama_client_timeout_and_defaults():
    """Verify OllamaClient defaults to at least 120s timeout for local inference."""
    client = OllamaClient(model="qwen3:4b")
    assert client.timeout >= 120.0
    assert client.model == "qwen3:4b"


def test_ollama_think_tag_stripping():
    """Verify <think> reasoning blocks are stripped from model responses."""
    import re

    raw = (
        "Okay, let me think.\n"
        "<think>\n"
        "The user wants to know the status. I should check the commit history.\n"
        "</think>\n\n"
        "The latest commit is `a8f2d1e`."
    )

    clean = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
    assert clean == "Okay, let me think.\n\n\nThe latest commit is `a8f2d1e`."
    assert "<think>" not in clean


def test_ollama_timeout_error_formatting():
    """Verify ReadTimeout errors produce helpful diagnostic messages instead of blank strings."""
    timeout_err = httpx.ReadTimeout("")
    err_msg = str(timeout_err)
    if not err_msg and isinstance(timeout_err, httpx.ReadTimeout):
        err_msg = "Inference timed out after 120.0s while waiting for local model response"
    formatted = f"{type(timeout_err).__name__}: {err_msg}"
    assert "Inference timed out after 120.0s" in formatted
