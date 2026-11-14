"""Schemas for dynamic model and LLM provider configuration."""

from typing import Any
from pydantic import BaseModel, Field


class ProviderInfo(BaseModel):
    """Information about a supported LLM provider."""

    id: str
    name: str
    model: str
    has_key: bool
    masked_key: str | None = None
    supported_models: list[str]
    description: str


class ModelsConfigResponse(BaseModel):
    """Current LLM engine configuration and catalog."""

    active_provider: str
    active_model: str
    allow_cloud_code: bool
    providers: dict[str, ProviderInfo]


class UpdateModelConfigRequest(BaseModel):
    """Request payload to change active model, provider, or API key."""

    provider: str = Field(..., description="Provider: gemini, openai, anthropic, openrouter, ollama")
    model: str | None = Field(None, description="Model identifier to use")
    api_key: str | None = Field(None, description="API key (if cloud provider)")
    allow_cloud_code: bool = Field(True, description="Consent to send private repository context to cloud LLM")


class TestModelRequest(BaseModel):
    """Request payload to test credentials for a model provider."""

    provider: str
    model: str | None = None
    api_key: str | None = None


class TestModelResponse(BaseModel):
    """Capability report for a tested model."""

    provider: str
    model: str
    is_available: bool
    supports_tool_calling: bool
    latency_ms: float = 0.0
    error_message: str | None = None
