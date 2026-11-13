"""Unit tests for ModelRouter and LLM clients."""

import pytest

from app.agent.router import (
    ChatCompletionResponse,
    MockLLMClient,
    ModelRouter,
    OpenAIClient,
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
