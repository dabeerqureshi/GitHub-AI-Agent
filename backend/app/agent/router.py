"""Provider-independent Model Router with privacy guardrails and capability validation."""

import asyncio
import logging
import re
from abc import ABC, abstractmethod
from typing import Any

import httpx
from pydantic import BaseModel

from app.core.config import get_settings

logger = logging.getLogger("app.agent.router")


class ChatCompletionResponse(BaseModel):
    """Normalized response from any LLM provider."""

    content: str
    tool_calls: list[dict[str, Any]] | None = None
    provider: str
    model: str
    raw_response: dict[str, Any] | None = None
    execution_time_seconds: float = 0.0


class ModelCapabilityReport(BaseModel):
    """Validation report of a model's tool-calling and response capabilities."""

    provider: str
    model: str
    is_available: bool
    supports_tool_calling: bool
    latency_ms: float = 0.0
    error_message: str | None = None


class BaseLLMClient(ABC):
    """Abstract interface for LLM providers."""

    @abstractmethod
    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        tools: list[dict[str, Any]] | None = None,
        temperature: float = 0.2,
    ) -> ChatCompletionResponse:
        """Generate a chat completion from the model."""
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        """Check if provider daemon / endpoint is reachable."""
        pass

    @abstractmethod
    async def validate_capabilities(self) -> ModelCapabilityReport:
        """Probe and validate whether the model can execute tool calls."""
        pass


class OllamaClient(BaseLLMClient):
    """Client for local Ollama daemon (Default local-only provider)."""

    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
        timeout: float | None = None,
    ):
        settings = get_settings()
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_MODEL
        self.timeout = timeout or float(getattr(settings, "OLLAMA_TIMEOUT_SECONDS", 120))
        self.max_retries = settings.MAX_RETRY_COUNT

    async def is_available(self) -> bool:
        """Ping Ollama daemon."""
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    async def validate_capabilities(self) -> ModelCapabilityReport:
        """Probe Ollama for model availability and tool-calling support."""
        if not await self.is_available():
            return ModelCapabilityReport(
                provider="ollama",
                model=self.model,
                is_available=False,
                supports_tool_calling=False,
                error_message="Ollama daemon is unreachable at " + self.base_url,
            )

        # Probe with simple tool
        test_tool = {
            "type": "function",
            "function": {
                "name": "check_status",
                "description": "Returns status check",
                "parameters": {"type": "object", "properties": {}},
            },
        }
        try:
            start = asyncio.get_event_loop().time()
            res = await self.chat_completion(
                [{"role": "user", "content": "Run check_status tool"}],
                tools=[test_tool],
            )
            elapsed = (asyncio.get_event_loop().time() - start) * 1000
            has_tools = bool(res.tool_calls)
            return ModelCapabilityReport(
                provider="ollama",
                model=self.model,
                is_available=True,
                supports_tool_calling=has_tools,
                latency_ms=round(elapsed, 2),
            )
        except Exception as e:
            return ModelCapabilityReport(
                provider="ollama",
                model=self.model,
                is_available=True,
                supports_tool_calling=False,
                error_message=str(e),
            )

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        tools: list[dict[str, Any]] | None = None,
        temperature: float = 0.2,
    ) -> ChatCompletionResponse:
        """Send chat request to Ollama HTTP API with retry policy."""
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": temperature},
        }
        if tools:
            payload["tools"] = tools

        last_error = None
        for attempt in range(self.max_retries):
            try:
                start = asyncio.get_event_loop().time()
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    res = await client.post(f"{self.base_url}/api/chat", json=payload)
                    if res.status_code != 200:
                        raise RuntimeError(f"Ollama error ({res.status_code}): {res.text}")
                    data = res.json()
                    message = data.get("message", {})
                    raw_content = message.get("content", "")

                    # Clean <think>...</think> reasoning blocks from local thinking models (e.g. qwen3:4b, DeepSeek-R1)
                    if "<think>" in raw_content:
                        clean_content = re.sub(r"<think>.*?</think>", "", raw_content, flags=re.DOTALL).strip()
                    else:
                        clean_content = raw_content

                    if not clean_content and message.get("thinking"):
                        clean_content = message.get("thinking")

                    elapsed = asyncio.get_event_loop().time() - start
                    return ChatCompletionResponse(
                        content=clean_content,
                        tool_calls=message.get("tool_calls"),
                        provider="ollama",
                        model=self.model,
                        raw_response=data,
                        execution_time_seconds=round(elapsed, 3),
                    )
            except Exception as e:
                err_msg = str(e)
                if not err_msg and isinstance(e, httpx.ReadTimeout):
                    err_msg = f"Inference timed out after {self.timeout}s while waiting for local model response"
                elif not err_msg and isinstance(e, httpx.ConnectError):
                    err_msg = f"Cannot connect to Ollama daemon at {self.base_url}"
                last_error = f"{type(e).__name__}: {err_msg}" if err_msg else type(e).__name__
                await asyncio.sleep(0.5 * (2**attempt))

        raise RuntimeError(f"Ollama request failed after {self.max_retries} attempts: {last_error}")


class OpenAIClient(BaseLLMClient):
    """Client for OpenAI Chat Completions API."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        timeout: float | None = None,
    ):
        settings = get_settings()
        self.api_key = api_key if api_key is not None else settings.OPENAI_API_KEY
        self.model = model or settings.OPENAI_MODEL
        self.base_url = "https://api.openai.com/v1"
        self.timeout = timeout or float(settings.REQUEST_TIMEOUT_SECONDS)
        self.max_retries = settings.MAX_RETRY_COUNT

    async def is_available(self) -> bool:
        return bool(self.api_key)

    async def validate_capabilities(self) -> ModelCapabilityReport:
        if not self.api_key:
            return ModelCapabilityReport(
                provider="openai",
                model=self.model,
                is_available=False,
                supports_tool_calling=False,
                error_message="OpenAI API key not configured",
            )
        return ModelCapabilityReport(
            provider="openai",
            model=self.model,
            is_available=True,
            supports_tool_calling=True,
        )

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        tools: list[dict[str, Any]] | None = None,
        temperature: float = 0.2,
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

        last_error = None
        for attempt in range(self.max_retries):
            try:
                start = asyncio.get_event_loop().time()
                async with httpx.AsyncClient(timeout=self.timeout) as client:
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
                    elapsed = asyncio.get_event_loop().time() - start
                    return ChatCompletionResponse(
                        content=choice.get("content") or "",
                        tool_calls=parsed_tool_calls,
                        provider="openai",
                        model=self.model,
                        raw_response=data,
                        execution_time_seconds=round(elapsed, 3),
                    )
            except Exception as e:
                last_error = e
                await asyncio.sleep(0.5 * (2**attempt))

        raise RuntimeError(f"OpenAI request failed after {self.max_retries} attempts: {last_error}")


class AnthropicClient(BaseLLMClient):
    """Client for Anthropic Messages API."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        timeout: float | None = None,
    ):
        settings = get_settings()
        self.api_key = api_key if api_key is not None else settings.ANTHROPIC_API_KEY
        self.model = model or settings.ANTHROPIC_MODEL
        self.base_url = "https://api.anthropic.com/v1"
        self.timeout = timeout or float(settings.REQUEST_TIMEOUT_SECONDS)
        self.max_retries = settings.MAX_RETRY_COUNT

    async def is_available(self) -> bool:
        return bool(self.api_key)

    async def validate_capabilities(self) -> ModelCapabilityReport:
        if not self.api_key:
            return ModelCapabilityReport(
                provider="anthropic",
                model=self.model,
                is_available=False,
                supports_tool_calling=False,
                error_message="Anthropic API key not configured",
            )
        return ModelCapabilityReport(
            provider="anthropic",
            model=self.model,
            is_available=True,
            supports_tool_calling=True,
        )

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        tools: list[dict[str, Any]] | None = None,
        temperature: float = 0.2,
    ) -> ChatCompletionResponse:
        if not self.api_key:
            raise ValueError("Anthropic API key not configured")

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        # Separate system messages
        system_content = "\n".join(m["content"] for m in messages if m.get("role") == "system")
        user_assistant_messages = [
            {"role": m["role"], "content": m["content"]}
            for m in messages
            if m.get("role") in ("user", "assistant")
        ]

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": user_assistant_messages,
            "max_tokens": 4096,
            "temperature": temperature,
        }
        if system_content:
            payload["system"] = system_content
        if tools:
            payload["tools"] = [
                {
                    "name": t.get("name"),
                    "description": t.get("description", ""),
                    "input_schema": t.get("parameters", {"type": "object"}),
                }
                for t in tools
            ]

        last_error = None
        for attempt in range(self.max_retries):
            try:
                start = asyncio.get_event_loop().time()
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    res = await client.post(
                        f"{self.base_url}/messages", headers=headers, json=payload
                    )
                    if res.status_code != 200:
                        raise RuntimeError(f"Anthropic error ({res.status_code}): {res.text}")
                    data = res.json()
                    content_blocks = data.get("content", [])
                    text_parts = [b["text"] for b in content_blocks if b.get("type") == "text"]
                    tool_use_blocks = [
                        {
                            "name": b["name"],
                            "arguments": b["input"],
                            "id": b.get("id"),
                        }
                        for b in content_blocks
                        if b.get("type") == "tool_use"
                    ]
                    elapsed = asyncio.get_event_loop().time() - start
                    return ChatCompletionResponse(
                        content="\n".join(text_parts),
                        tool_calls=tool_use_blocks if tool_use_blocks else None,
                        provider="anthropic",
                        model=self.model,
                        raw_response=data,
                        execution_time_seconds=round(elapsed, 3),
                    )
            except Exception as e:
                last_error = e
                await asyncio.sleep(0.5 * (2**attempt))

        raise RuntimeError(
            f"Anthropic request failed after {self.max_retries} attempts: {last_error}"
        )


class GeminiClient(BaseLLMClient):
    """Client for Google Gemini API via official OpenAI-compatible endpoint."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        timeout: float | None = None,
    ):
        settings = get_settings()
        self.api_key = api_key if api_key is not None else settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/openai"
        self.timeout = timeout or float(settings.REQUEST_TIMEOUT_SECONDS)
        self.max_retries = settings.MAX_RETRY_COUNT

    async def is_available(self) -> bool:
        return bool(self.api_key)

    async def validate_capabilities(self) -> ModelCapabilityReport:
        if not self.api_key:
            return ModelCapabilityReport(
                provider="gemini",
                model=self.model,
                is_available=False,
                supports_tool_calling=False,
                error_message="Gemini API key not configured",
            )
        return ModelCapabilityReport(
            provider="gemini",
            model=self.model,
            is_available=True,
            supports_tool_calling=True,
        )

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        tools: list[dict[str, Any]] | None = None,
        temperature: float = 0.2,
    ) -> ChatCompletionResponse:
        if not self.api_key:
            raise ValueError("Gemini API key not configured")

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

        last_error = None
        for attempt in range(self.max_retries):
            try:
                start = asyncio.get_event_loop().time()
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    res = await client.post(
                        f"{self.base_url}/chat/completions", headers=headers, json=payload
                    )
                    if res.status_code == 404 and (
                        "not found" in res.text.lower()
                        or "no longer available" in res.text.lower()
                        or "not supported for generatecontent" in res.text.lower()
                        or "not_found" in res.text.lower()
                    ):
                        if payload.get("model") != "gemini-3.8-flash":
                            logger.warning(
                                "Gemini model '%s' unavailable or deprecated. Falling back to 'gemini-3.8-flash'",
                                payload.get("model"),
                            )
                            payload["model"] = "gemini-3.8-flash"
                            self.model = "gemini-3.8-flash"
                            res = await client.post(
                                f"{self.base_url}/chat/completions", headers=headers, json=payload
                            )
                    if res.status_code != 200:
                        raise RuntimeError(f"Gemini error ({res.status_code}): {res.text}")
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
                    elapsed = asyncio.get_event_loop().time() - start
                    return ChatCompletionResponse(
                        content=choice.get("content") or "",
                        tool_calls=parsed_tool_calls,
                        provider="gemini",
                        model=self.model,
                        raw_response=data,
                        execution_time_seconds=round(elapsed, 3),
                    )
            except Exception as e:
                last_error = e
                await asyncio.sleep(0.5 * (2**attempt))

        raise RuntimeError(f"Gemini request failed after {self.max_retries} attempts: {last_error}")


class OpenRouterClient(BaseLLMClient):
    """Client for OpenRouter API supporting hundreds of models via OpenAI-compatible endpoint."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        timeout: float | None = None,
    ):
        settings = get_settings()
        self.api_key = api_key if api_key is not None else settings.OPENROUTER_API_KEY
        self.model = model or settings.OPENROUTER_MODEL
        self.base_url = "https://openrouter.ai/api/v1"
        self.timeout = timeout or float(settings.REQUEST_TIMEOUT_SECONDS)
        self.max_retries = settings.MAX_RETRY_COUNT

    async def is_available(self) -> bool:
        return bool(self.api_key)

    async def validate_capabilities(self) -> ModelCapabilityReport:
        if not self.api_key:
            return ModelCapabilityReport(
                provider="openrouter",
                model=self.model,
                is_available=False,
                supports_tool_calling=False,
                error_message="OpenRouter API key not configured",
            )
        return ModelCapabilityReport(
            provider="openrouter",
            model=self.model,
            is_available=True,
            supports_tool_calling=True,
        )

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        tools: list[dict[str, Any]] | None = None,
        temperature: float = 0.2,
    ) -> ChatCompletionResponse:
        if not self.api_key:
            raise ValueError("OpenRouter API key not configured")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "GitHub AI Workspace",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }
        if tools:
            payload["tools"] = [{"type": "function", "function": t} for t in tools]

        last_error = None
        for attempt in range(self.max_retries):
            try:
                start = asyncio.get_event_loop().time()
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    res = await client.post(
                        f"{self.base_url}/chat/completions", headers=headers, json=payload
                    )
                    if res.status_code != 200:
                        raise RuntimeError(f"OpenRouter error ({res.status_code}): {res.text}")
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
                    elapsed = asyncio.get_event_loop().time() - start
                    return ChatCompletionResponse(
                        content=choice.get("content") or "",
                        tool_calls=parsed_tool_calls,
                        provider="openrouter",
                        model=self.model,
                        raw_response=data,
                        execution_time_seconds=round(elapsed, 3),
                    )
            except Exception as e:
                last_error = e
                await asyncio.sleep(0.5 * (2**attempt))

        raise RuntimeError(
            f"OpenRouter request failed after {self.max_retries} attempts: {last_error}"
        )


class MockLLMClient(BaseLLMClient):
    """Deterministic mock client for testing and offline environments."""

    def __init__(self, predefined_responses: list[ChatCompletionResponse] | None = None):
        self.predefined_responses = predefined_responses or []
        self._index = 0

    async def is_available(self) -> bool:
        return True

    async def validate_capabilities(self) -> ModelCapabilityReport:
        return ModelCapabilityReport(
            provider="mock",
            model="mock-agent-v1",
            is_available=True,
            supports_tool_calling=True,
        )

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

        last_msg = messages[-1]["content"] if messages else ""
        return ChatCompletionResponse(
            content=f"Processed instruction: {last_msg}",
            provider="mock",
            model="mock-agent-v1",
        )


SOURCE_CODE_PATTERNS = [
    re.compile(r"```[a-zA-Z]*\n[\s\S]*?```"),
    re.compile(r"(def |class |function |import |from |package |func )"),
]


def contains_private_code(content: str) -> bool:
    """Detect whether prompt or context contains source code."""
    for pattern in SOURCE_CODE_PATTERNS:
        if pattern.search(content):
            return True
    return False


class ModelRouter:
    """
    Intelligent Model Router with Privacy Guardrails.

    Policy:
    - Default to local Ollama.
    - Cloud models (OpenAI/Anthropic) only when explicitly configured.
    - NEVER transmit source code or repo files to cloud providers unless
      ALLOW_CLOUD_CODE_ANALYSIS is true.
    """

    def __init__(self):
        settings = get_settings()
        self.preferred_provider = settings.DEFAULT_AI_PROVIDER.lower()
        self.allow_cloud_code = settings.ALLOW_CLOUD_CODE_ANALYSIS
        self.enable_fallback = settings.ENABLE_CLOUD_FALLBACK

        self.ollama_client = OllamaClient()
        self.openai_client = OpenAIClient()
        self.anthropic_client = AnthropicClient()
        self.gemini_client = GeminiClient()
        self.openrouter_client = OpenRouterClient()

    def refresh_from_settings(self):
        """Reload configuration and clients from active application settings."""
        settings = get_settings()
        self.preferred_provider = settings.DEFAULT_AI_PROVIDER.lower()
        self.allow_cloud_code = settings.ALLOW_CLOUD_CODE_ANALYSIS
        self.enable_fallback = settings.ENABLE_CLOUD_FALLBACK

        self.ollama_client = OllamaClient(model=settings.OLLAMA_MODEL)
        self.openai_client = OpenAIClient(api_key=settings.OPENAI_API_KEY, model=settings.OPENAI_MODEL)
        self.anthropic_client = AnthropicClient(api_key=settings.ANTHROPIC_API_KEY, model=settings.ANTHROPIC_MODEL)
        self.gemini_client = GeminiClient(api_key=settings.GEMINI_API_KEY, model=settings.GEMINI_MODEL)
        self.openrouter_client = OpenRouterClient(api_key=settings.OPENROUTER_API_KEY, model=settings.OPENROUTER_MODEL)

    async def get_active_client(self, content_to_process: str = "") -> BaseLLMClient:
        """
        Select active LLM client with strict privacy guardrail enforcement.
        """
        has_code = contains_private_code(content_to_process)

        # Privacy gate: if content contains code and cloud consent not given, force local Ollama
        if has_code and not self.allow_cloud_code:
            return self.ollama_client

        if self.preferred_provider == "ollama":
            if await self.ollama_client.is_available():
                return self.ollama_client
            # Fallback if enabled and no private code
            if self.enable_fallback and not has_code:
                if await self.gemini_client.is_available():
                    return self.gemini_client
                if await self.openrouter_client.is_available():
                    return self.openrouter_client
                if await self.openai_client.is_available():
                    return self.openai_client
                if await self.anthropic_client.is_available():
                    return self.anthropic_client
            return self.ollama_client

        elif self.preferred_provider == "gemini":
            if await self.gemini_client.is_available():
                return self.gemini_client
            if await self.ollama_client.is_available():
                return self.ollama_client

        elif self.preferred_provider == "openrouter":
            if await self.openrouter_client.is_available():
                return self.openrouter_client
            if await self.ollama_client.is_available():
                return self.ollama_client

        elif self.preferred_provider == "openai":
            if await self.openai_client.is_available():
                return self.openai_client
            if await self.ollama_client.is_available():
                return self.ollama_client

        elif self.preferred_provider == "anthropic":
            if await self.anthropic_client.is_available():
                return self.anthropic_client
            if await self.ollama_client.is_available():
                return self.ollama_client

        return self.ollama_client
