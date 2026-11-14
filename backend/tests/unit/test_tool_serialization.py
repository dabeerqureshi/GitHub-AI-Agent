"""Unit tests for ToolRegistry output serialization and safe JSON dumping."""

import json
from unittest.mock import MagicMock

import pytest

from app.agent.tools.registry import ToolRegistry
from app.api.v1.chat import safe_json_dumps
from app.schemas.intelligence import (
    ArchitectureSummary,
    BranchComparison,
    FileBrowseItem,
    FileContentWithLines,
    SearchResultItem,
)


def test_safe_json_dumps_with_pydantic_model():
    """Verify safe_json_dumps successfully encodes Pydantic models."""
    summary = ArchitectureSummary(
        full_name="dabeerqureshi/AI-Sales-Development-Agent",
        commit_sha="7089fa3a",
        primary_languages=["Python", "TypeScript"],
        frameworks_detected=[],
        verified_facts=["Repository contains Python source files."],
        reasonable_inferences=["Architecture is modular."],
        unknown_information=[],
        markdown_report="# Architecture Report",
    )

    encoded = safe_json_dumps({"tool": "repo_architecture_summary", "result": {"content": summary}})
    assert isinstance(encoded, str)
    parsed = json.loads(encoded)
    assert parsed["tool"] == "repo_architecture_summary"
    assert parsed["result"]["content"]["full_name"] == "dabeerqureshi/AI-Sales-Development-Agent"
    assert parsed["result"]["content"]["markdown_report"] == "# Architecture Report"


@pytest.mark.asyncio
async def test_tool_registry_serializes_architecture_summary():
    """Verify ToolRegistry.execute produces jsonable serialized dicts for ArchitectureSummary."""
    mock_intelligence = MagicMock()
    summary = ArchitectureSummary(
        full_name="dabeerqureshi/AI-Sales-Development-Agent",
        commit_sha="7089fa3a",
        primary_languages=["Python"],
        frameworks_detected=[],
        verified_facts=["Verified Python codebase."],
        reasonable_inferences=["Standard design."],
        unknown_information=[],
        markdown_report="## Architecture Summary Report",
    )
    mock_intelligence.generate_architecture_summary.return_value = summary

    registry = ToolRegistry(intelligence_service=mock_intelligence)
    res = await registry.execute(
        "repo_architecture_summary",
        {"owner": "dabeerqureshi", "repo": "AI-Sales-Development-Agent"},
    )

    assert res["tool"] == "repo_architecture_summary"
    assert res["is_error"] is False
    assert isinstance(res["content"], dict)
    assert res["content"]["full_name"] == "dabeerqureshi/AI-Sales-Development-Agent"
    assert res["content"]["markdown_report"] == "## Architecture Summary Report"

    # Should serialize to JSON without error
    dumped = json.dumps(res)
    assert "Architecture Summary Report" in dumped


@pytest.mark.asyncio
async def test_tool_registry_serializes_file_content_with_lines():
    """Verify ToolRegistry.execute serializes FileContentWithLines."""
    mock_intelligence = MagicMock()
    file_content = FileContentWithLines(
        path="main.py",
        total_lines=10,
        start_line=1,
        end_line=10,
        content="print('hello')",
        citation="[main.py#L1-L10]",
    )
    mock_intelligence.get_file_content_with_lines.return_value = file_content

    registry = ToolRegistry(intelligence_service=mock_intelligence)
    res = await registry.execute("repo_read_file", {"owner": "test", "repo": "test", "path": "main.py"})

    assert isinstance(res["content"], dict)
    assert res["content"]["citation"] == "[main.py#L1-L10]"
    # Ensure native json.dumps succeeds
    assert json.dumps(res)
