"""LLM Provider and Model Management API endpoints."""

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.agent.router import (
    AnthropicClient,
    GeminiClient,
    OllamaClient,
    OpenAIClient,
    OpenRouterClient,
)
from app.core.config import get_settings
from app.core.security import mask_secret
from app.schemas.models import (
    ModelsConfigResponse,
    ProviderInfo,
    TestModelRequest,
    TestModelResponse,
    UpdateModelConfigRequest,
)

logger = logging.getLogger("app.api.v1.models")
router = APIRouter(prefix="/models", tags=["Model Providers"])

DEFAULT_PROVIDER_CATALOG = {
    "gemini": {
        "id": "gemini",
        "name": "Google Gemini",
        "description": "Google's frontier multimodal model with 1M context and native tool calling.",
        "supported_models": [
            "gemini-3.8-flash",
            "gemini-3.8-pro",
            "gemini-3.8-flash-cyber",
        ],
    },
    "openai": {
        "id": "openai",
        "name": "OpenAI",
        "description": "Industry standard reasoning and coding models.",
        "supported_models": [
            "gpt-4o",
            "gpt-4o-mini",
            "o3-mini",
            "gpt-4-turbo",
        ],
    },
    "anthropic": {
        "id": "anthropic",
        "name": "Anthropic Claude",
        "description": "Top-tier code generation and complex multi-file reasoning.",
        "supported_models": [
            "claude-3-5-sonnet-20241022",
            "claude-3-5-haiku-20241022",
            "claude-3-opus-20240229",
        ],
    },
    "openrouter": {
        "id": "openrouter",
        "name": "OpenRouter",
        "description": "Unified gateway to over 100+ open-source and proprietary models.",
        "supported_models": [
            "meta-llama/llama-3.3-70b-instruct",
            "anthropic/claude-3.5-sonnet",
            "google/gemini-2.0-flash-exp:free",
            "deepseek/deepseek-r1",
            "openai/gpt-4o",
            "qwen/qwen-2.5-coder-32b-instruct",
        ],
    },
    "ollama": {
        "id": "ollama",
        "name": "Ollama (Local)",
        "description": "100% private, offline inference running directly on your machine.",
        "supported_models": [
            "qwen2.5-coder:7b",
            "qwen2.5-coder:1.5b",
            "llama3.2:3b",
            "deepseek-r1:8b",
            "mistral:7b",
        ],
    },
}


def _get_provider_details(provider_id: str, settings: Any) -> ProviderInfo:
    info = DEFAULT_PROVIDER_CATALOG[provider_id]
    if provider_id == "gemini":
        key = settings.GEMINI_API_KEY
        model = settings.GEMINI_MODEL
    elif provider_id == "openai":
        key = settings.OPENAI_API_KEY
        model = settings.OPENAI_MODEL
    elif provider_id == "anthropic":
        key = settings.ANTHROPIC_API_KEY
        model = settings.ANTHROPIC_MODEL
    elif provider_id == "openrouter":
        key = settings.OPENROUTER_API_KEY
        model = settings.OPENROUTER_MODEL
    elif provider_id == "ollama":
        key = "local"
        model = settings.OLLAMA_MODEL
    else:
        key = ""
        model = ""

    return ProviderInfo(
        id=info["id"],
        name=info["name"],
        model=model,
        has_key=bool(key),
        masked_key=mask_secret(key) if key and key != "local" else (key if key == "local" else None),
        supported_models=info["supported_models"],
        description=info["description"],
    )


@router.get("/config", response_model=ModelsConfigResponse)
async def get_models_config():
    """Retrieve all supported LLM providers, active selection, and masked credentials."""
    settings = get_settings()
    active_provider = settings.DEFAULT_AI_PROVIDER.lower()
    active_model = getattr(
        settings,
        f"{active_provider.upper()}_MODEL",
        "default-model",
    )

    providers = {
        pid: _get_provider_details(pid, settings)
        for pid in DEFAULT_PROVIDER_CATALOG
    }

    return ModelsConfigResponse(
        active_provider=active_provider,
        active_model=active_model,
        allow_cloud_code=settings.ALLOW_CLOUD_CODE_ANALYSIS,
        providers=providers,
    )


def _save_env_variable(var_name: str, var_value: str) -> None:
    """Safely persist variable to root .env file if it exists."""
    from app.core.config import ROOT_DIR
    env_path = ROOT_DIR / ".env"
    if not env_path.exists():
        return
    try:
        content = env_path.read_text(encoding="utf-8")
        lines = content.splitlines()
        found = False
        new_lines = []
        for line in lines:
            if line.startswith(f"{var_name}=") or line.startswith(f"# {var_name}="):
                new_lines.append(f"{var_name}={var_value}")
                found = True
            else:
                new_lines.append(line)
        if not found:
            new_lines.append(f"{var_name}={var_value}")
        env_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    except Exception as e:
        logger.warning("Could not persist %s to .env: %s", var_name, str(e))


@router.post("/config", response_model=ModelsConfigResponse)
async def update_models_config(payload: UpdateModelConfigRequest):
    """
    Update active LLM provider, active model, and API key at runtime.
    Automatically validates permissions, updates router, and persists credentials.
    """
    settings = get_settings()
    provider = payload.provider.lower().strip()

    if provider not in DEFAULT_PROVIDER_CATALOG:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported provider '{provider}'. Must be one of: {list(DEFAULT_PROVIDER_CATALOG.keys())}",
        )

    # 1. Update API key if provided
    if payload.api_key is not None and payload.api_key.strip():
        key = payload.api_key.strip()
        if provider == "gemini":
            settings.GEMINI_API_KEY = key
            _save_env_variable("GEMINI_API_KEY", key)
        elif provider == "openai":
            settings.OPENAI_API_KEY = key
            _save_env_variable("OPENAI_API_KEY", key)
        elif provider == "anthropic":
            settings.ANTHROPIC_API_KEY = key
            _save_env_variable("ANTHROPIC_API_KEY", key)
        elif provider == "openrouter":
            settings.OPENROUTER_API_KEY = key
            _save_env_variable("OPENROUTER_API_KEY", key)

    # 2. Update model name if provided
    if payload.model and payload.model.strip():
        model_name = payload.model.strip()
        if provider == "gemini":
            settings.GEMINI_MODEL = model_name
            _save_env_variable("GEMINI_MODEL", model_name)
        elif provider == "openai":
            settings.OPENAI_MODEL = model_name
            _save_env_variable("OPENAI_MODEL", model_name)
        elif provider == "anthropic":
            settings.ANTHROPIC_MODEL = model_name
            _save_env_variable("ANTHROPIC_MODEL", model_name)
        elif provider == "openrouter":
            settings.OPENROUTER_MODEL = model_name
            _save_env_variable("OPENROUTER_MODEL", model_name)
        elif provider == "ollama":
            settings.OLLAMA_MODEL = model_name
            _save_env_variable("OLLAMA_MODEL", model_name)

    # 3. Update active provider and cloud privacy consent
    settings.DEFAULT_AI_PROVIDER = provider
    _save_env_variable("DEFAULT_AI_PROVIDER", provider)
    if provider != "ollama":
        settings.ALLOW_CLOUD_CODE_ANALYSIS = payload.allow_cloud_code
        _save_env_variable("ALLOW_CLOUD_CODE_ANALYSIS", str(payload.allow_cloud_code).lower())

    logger.info("Updated active AI provider to '%s' (Model: %s)", provider, payload.model)

    return await get_models_config()


@router.post("/test", response_model=TestModelResponse)
async def test_model_connection(payload: TestModelRequest):
    """Probe and test credentials and tool-calling capability for a given provider."""
    settings = get_settings()
    provider = payload.provider.lower().strip()

    if provider == "gemini":
        key = payload.api_key or settings.GEMINI_API_KEY
        model = payload.model or settings.GEMINI_MODEL
        client = GeminiClient(api_key=key, model=model)
    elif provider == "openai":
        key = payload.api_key or settings.OPENAI_API_KEY
        model = payload.model or settings.OPENAI_MODEL
        client = OpenAIClient(api_key=key, model=model)
    elif provider == "anthropic":
        key = payload.api_key or settings.ANTHROPIC_API_KEY
        model = payload.model or settings.ANTHROPIC_MODEL
        client = AnthropicClient(api_key=key, model=model)
    elif provider == "openrouter":
        key = payload.api_key or settings.OPENROUTER_API_KEY
        model = payload.model or settings.OPENROUTER_MODEL
        client = OpenRouterClient(api_key=key, model=model)
    elif provider == "ollama":
        model = payload.model or settings.OLLAMA_MODEL
        client = OllamaClient(model=model)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown provider '{provider}'",
        )

    report = await client.validate_capabilities()
    return TestModelResponse(
        provider=report.provider,
        model=report.model,
        is_available=report.is_available,
        supports_tool_calling=report.supports_tool_calling,
        latency_ms=report.latency_ms,
        error_message=report.error_message,
    )
