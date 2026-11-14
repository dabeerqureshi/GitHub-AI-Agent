"""Unit tests for ModelRouter and LLM clients."""

import pytest

from app.agent.router import (
    ChatCompletionResponse,
    GeminiClient,
    MockLLMClient,
    ModelRouter,
    OpenAIClient,
    OpenRouterClient,
)


@pytest.mark.asyncio
async def test_mock_llm_client():
    """Verify MockLLMClient returns predefined responses deterministically."""
    mock_resp = ChatCompletionResponse(
        content="Analyzed repository structure",
        provider="mock",
        model="test-model",
    )
    client = MockLLMClient([mock_resp])
    assert await client.is_available() is True

    res = await client.chat_completion([{"role": "user", "content": "analyze repo"}])
    assert res.content == "Analyzed repository structure"
    assert res.provider == "mock"


@pytest.mark.asyncio
async def test_model_router_fallback():
    """Verify ModelRouter fallback mechanisms."""
    router = ModelRouter()
    client = await router.get_active_client()
    assert client is not None


def test_openai_client_validation():
    """Verify OpenAI client requires API key."""
    client = OpenAIClient(api_key="")
    assert client.api_key == ""


@pytest.mark.asyncio
async def test_gemini_client_validation():
    """Verify Gemini client capability validation."""
    client = GeminiClient(api_key="")
    report = await client.validate_capabilities()
    assert report.is_available is False
    assert report.provider == "gemini"

    client_with_key = GeminiClient(api_key="AIzaSyTestGeminiKey123")
    assert await client_with_key.is_available() is True
    report_valid = await client_with_key.validate_capabilities()
    assert report_valid.is_available is True
    assert report_valid.supports_tool_calling is True


@pytest.mark.asyncio
async def test_openrouter_client_validation():
    """Verify OpenRouter client capability validation."""
    client = OpenRouterClient(api_key="")
    report = await client.validate_capabilities()
    assert report.is_available is False
    assert report.provider == "openrouter"

    client_with_key = OpenRouterClient(api_key="sk-or-v1-testkey1234")
    assert await client_with_key.is_available() is True
    report_valid = await client_with_key.validate_capabilities()
    assert report_valid.is_available is True
    assert report_valid.supports_tool_calling is True
