"""Application configuration module using Pydantic Settings."""

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_STORAGE_DIR = BACKEND_DIR / "storage"
DEFAULT_DB_PATH = DEFAULT_STORAGE_DIR / "github_agent.db"


class Settings(BaseSettings):
    """Application settings with environment variable overrides."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    FRONTEND_URL: str = "http://localhost:3000"

    # Security
    SECRET_KEY: str = "insecure-dev-secret-key-replace-in-production-32-chars-min"
    ALLOWED_ORIGINS: list[str] | str = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"]
    )
    RATE_LIMIT_PER_MINUTE: int = 60

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, set)):
            return list(v)
        return ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{DEFAULT_DB_PATH}"

    # Storage & Local Git Workspaces
    WORKSPACE_DIR: str = str(DEFAULT_STORAGE_DIR / "workspaces")
    AUDIT_LOG_RETENTION_DAYS: int = 90

    # AI Providers & Model Routing
    DEFAULT_AI_PROVIDER: str = "ollama"  # ollama | openai | anthropic
    DEFAULT_TEMPERATURE: float = 0.2
    REQUEST_TIMEOUT_SECONDS: int = 45
    MAX_RETRY_COUNT: int = 3
    MAX_TOOL_CALLS: int = 5

    # Cloud Privacy Guardrail: Never transmit private code without explicit consent
    ALLOW_CLOUD_CODE_ANALYSIS: bool = False
    ENABLE_CLOUD_FALLBACK: bool = False

    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5-coder:7b"

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"

    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"

    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "meta-llama/llama-3.3-70b-instruct"

    # GitHub Integration
    GITHUB_PERSONAL_ACCESS_TOKEN: str = ""
    GITHUB_MCP_TRANSPORT: str = "stdio"
    GITHUB_MCP_COMMAND: str = "npx -y @modelcontextprotocol/server-github"

    # Human-In-The-Loop
    REQUIRE_APPROVAL_FOR_MUTATIONS: bool = True
    AUTO_APPROVE_SAFE_READS: bool = True


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()
