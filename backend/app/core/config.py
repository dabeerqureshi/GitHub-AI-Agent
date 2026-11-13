"""Application configuration module using Pydantic Settings."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
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
    ALLOWED_ORIGINS: list[str] = Field(default=["http://localhost:3000", "http://127.0.0.1:3000"])
    RATE_LIMIT_PER_MINUTE: int = 60

    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{DEFAULT_DB_PATH}"

    # Storage & Local Git Workspaces
    WORKSPACE_DIR: str = str(DEFAULT_STORAGE_DIR / "workspaces")
    AUDIT_LOG_RETENTION_DAYS: int = 90

    # AI Providers
    DEFAULT_AI_PROVIDER: str = "ollama"  # ollama | openai | anthropic
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5-coder:7b"

    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"

    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"

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
