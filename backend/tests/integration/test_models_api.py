"""Integration tests for dynamic model provider configuration and testing endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import get_settings
from app.main import create_app


@pytest.mark.asyncio
async def test_get_models_config():
    """Verify endpoint returns provider catalog and active configuration."""
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/models/config")
        assert res.status_code == 200
        data = res.json()
        assert "active_provider" in data
        assert "providers" in data
        assert "gemini" in data["providers"]
        assert "openai" in data["providers"]
        assert "anthropic" in data["providers"]
        assert "openrouter" in data["providers"]
        assert "ollama" in data["providers"]


@pytest.mark.asyncio
async def test_update_models_config_and_test_endpoint():
    """Verify updating provider, model and testing connection."""
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Update config to Gemini
        res = await client.post(
            "/api/v1/models/config",
            json={
                "provider": "gemini",
                "model": "gemini-2.0-flash",
                "api_key": "AIzaSyTestGeminiKey998877",
                "allow_cloud_code": True,
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["active_provider"] == "gemini"
        assert data["active_model"] == "gemini-2.0-flash"
        assert data["providers"]["gemini"]["has_key"] is True

        # 2. Test model probe endpoint
        test_res = await client.post(
            "/api/v1/models/test",
            json={
                "provider": "gemini",
                "model": "gemini-2.0-flash",
                "api_key": "AIzaSyTestGeminiKey998877",
            },
        )
        assert test_res.status_code == 200
        tdata = test_res.json()
        assert tdata["provider"] == "gemini"
        assert tdata["is_available"] is True
        assert tdata["supports_tool_calling"] is True

        # 3. Test OpenRouter provider
        or_res = await client.post(
            "/api/v1/models/config",
            json={
                "provider": "openrouter",
                "model": "meta-llama/llama-3.3-70b-instruct",
                "api_key": "sk-or-v1-testkey1234567890",
                "allow_cloud_code": True,
            },
        )
        assert or_res.status_code == 200
        odata = or_res.json()
        assert odata["active_provider"] == "openrouter"
