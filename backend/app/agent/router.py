"""Provider-independent Model Router supporting Ollama, OpenAI, and Anthropic."""

from abc import ABC, abstractmethod
from typing import Any

import httpx
from pydantic import BaseModel

from app.core.config import get_settings


class ChatCompletionResponse(BaseModel):
    """Normalized response from any LLM provider."""

    content: str
    tool_calls: list[dict[str, Any]] | None = None
    provider: str
    model: str
    raw_response: dict[str, Any] | None = None


class BaseLLMClient(ABC):
    """Abstract interface for LLM providers."""

    @abstractmethod
    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        tools: list[dict[str, Any]] | None = None,  # noqa: ARG002
        temperature: float = 0.2,  # noqa: ARG002
    ) -> ChatCompletionResponse:
        """Generate a chat completion from the model."""
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        """Check if provider daemon / endpoint is reachable."""
        pass


class OllamaClient(BaseLLMClient):
    """Client for local Ollama daemon."""

    def __init__(self, base_url: str | None = None, model: str | None = None):
        settings = get_settings()
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_MODEL

    async def is_available(self) -> bool:
        """Ping Ollama daemon."""
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        tools: list[dict[str, Any]] | None = None,  # noqa: ARG002
        temperature: float = 0.2,  # noqa: ARG002
    ) -> ChatCompletionResponse:
        """Send chat request to Ollama HTTP API."""
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": temperature},
        }
        if tools:
            payload["tools"] = tools

        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(f"{self.base_url}/api/chat", json=payload)
            if res.status_code != 200:
                raise RuntimeError(f"Ollama error ({res.status_code}): {res.text}")
            data = res.json()
            message = data.get("message", {})
            return ChatCompletionResponse(
                content=message.get("content", ""),
                tool_calls=message.get("tool_calls"),
                provider="ollama",
                model=self.model,
                raw_response=data,
            )


class OpenAIClient(BaseLLMClient):
    """Client for OpenAI Chat Completions API."""

    def __init__(self, api_key: str | None = None, model: str | None = None):
        settings = get_settings()
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL
        self.base_url = "https://api.openai.com/v1"

    async def is_available(self) -> bool:
        return bool(self.api_key)

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        tools: list[dict[str, Any]] | None = None,  # noqa: ARG002
        temperature: float = 0.2,  # noqa: ARG002
    ) -> ChatCompletionResponse:
        if not self.api_key:
            raise ValueError("OpenAI API key not configured")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }
        if tools:
            payload["tools"] = [{"type": "function", "function": t} for t in tools]

        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(
                f"{self.base_url}/chat/completions", headers=headers, json=payload
            )
            if res.status_code != 200:
                raise RuntimeError(f"OpenAI error ({res.status_code}): {res.text}")
            data = res.json()
            choice = data["choices"][0]["message"]
            raw_tool_calls = choice.get("tool_calls")
            parsed_tool_calls = None
            if raw_tool_calls:
                parsed_tool_calls = [
                    {
                        "name": tc["function"]["name"],
                        "arguments": tc["function"]["arguments"],
                        "id": tc.get("id"),
                    }
                    for tc in raw_tool_calls
                ]

            return ChatCompletionResponse(
                content=choice.get("content") or "",
                tool_calls=parsed_tool_calls,
                provider="openai",
                model=self.model,
                raw_response=data,
            )


class MockLLMClient(BaseLLMClient):
    """Deterministic mock client for testing and offline environments."""

    def __init__(self, predefined_responses: list[ChatCompletionResponse] | None = None):
        self.predefined_responses = predefined_responses or []
        self._index = 0

    async def is_available(self) -> bool:
        return True

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        tools: list[dict[str, Any]] | None = None,  # noqa: ARG002
        temperature: float = 0.2,  # noqa: ARG002
    ) -> ChatCompletionResponse:
        if self._index < len(self.predefined_responses):
            res = self.predefined_responses[self._index]
            self._index += 1
            return res

        # Default fallback response
        last_msg = messages[-1]["content"] if messages else ""
        return ChatCompletionResponse(
            content=f"Processed instruction: {last_msg}",
            provider="mock",
            model="mock-agent-v1",
        )


class ModelRouter:
    """Routes LLM requests to appropriate provider based on settings and availability."""

    def __init__(self):
        settings = get_settings()
        self.preferred_provider = settings.DEFAULT_AI_PROVIDER.lower()
        self.ollama_client = OllamaClient()
        self.openai_client = OpenAIClient()

    async def get_active_client(self) -> BaseLLMClient:
        """Select reachable client honoring preferred provider."""
        if self.preferred_provider == "ollama":
            if await self.ollama_client.is_available():
                return self.ollama_client
            # Fallback to OpenAI if configured
            if await self.openai_client.is_available():
                return self.openai_client
        elif self.preferred_provider == "openai":
            if await self.openai_client.is_available():
                return self.openai_client
            if await self.ollama_client.is_available():
                return self.ollama_client

        # Default return ollama client even if daemon is not currently up
        return self.ollama_client
