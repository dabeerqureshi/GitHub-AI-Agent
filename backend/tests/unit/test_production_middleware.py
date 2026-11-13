"""Unit tests for Phase 9 production middleware: correlation tracking, security headers, rate limiting, and CSRF protection."""

import pytest
from httpx import ASGITransport, AsyncClient
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route

from app.core.middleware import (
    CorrelationIdMiddleware,
    CSRFProtectionMiddleware,
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
)


async def dummy_endpoint(_request):
    return JSONResponse({"status": "ok"})


async def mutate_endpoint(_request):
    return JSONResponse({"status": "created"}, status_code=201)


@pytest.fixture
def middleware_test_app():
    """Create test Starlette app wired with all production middleware."""
    app = Starlette(
        routes=[
            Route("/dummy", dummy_endpoint, methods=["GET"]),
            Route("/mutate", mutate_endpoint, methods=["POST"]),
        ]
    )
    # Order: innermost to outermost
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RateLimitMiddleware, requests_per_minute=5)
    app.add_middleware(
        CSRFProtectionMiddleware,
        allowed_origins=["http://localhost:3000", "https://app.workspace.ai"],
    )
    app.add_middleware(CorrelationIdMiddleware)
    return app


@pytest.mark.asyncio
async def test_correlation_id_middleware(middleware_test_app):
    """Verify X-Correlation-ID is generated or preserved across response headers."""
    async with AsyncClient(
        transport=ASGITransport(app=middleware_test_app), base_url="http://test"
    ) as client:
        # Auto-generation
        res1 = await client.get("/dummy")
        assert res1.status_code == 200
        assert "X-Correlation-ID" in res1.headers
        cid1 = res1.headers["X-Correlation-ID"]
        assert cid1.startswith("req-")

        # Propagation of existing correlation ID
        custom_cid = "trace-custom-998877"
        res2 = await client.get("/dummy", headers={"X-Correlation-ID": custom_cid})
        assert res2.status_code == 200
        assert res2.headers["X-Correlation-ID"] == custom_cid


@pytest.mark.asyncio
async def test_security_headers_middleware(middleware_test_app):
    """Verify security headers are injected on all HTTP responses."""
    async with AsyncClient(
        transport=ASGITransport(app=middleware_test_app), base_url="http://test"
    ) as client:
        res = await client.get("/dummy")
        assert res.status_code == 200
        assert res.headers["X-Content-Type-Options"] == "nosniff"
        assert res.headers["X-Frame-Options"] == "DENY"
        assert res.headers["X-XSS-Protection"] == "1; mode=block"
        assert res.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
        assert "frame-ancestors 'none'" in res.headers["Content-Security-Policy"]


@pytest.mark.asyncio
async def test_csrf_protection_middleware(middleware_test_app):
    """Verify state-mutating requests from disallowed origins are blocked with 403."""
    async with AsyncClient(
        transport=ASGITransport(app=middleware_test_app), base_url="http://test"
    ) as client:
        # Legitimate origin
        res_valid = await client.post(
            "/mutate",
            headers={"Origin": "https://app.workspace.ai"},
            json={"data": "test"},
        )
        assert res_valid.status_code == 201

        # Malicious origin
        res_blocked = await client.post(
            "/mutate",
            headers={"Origin": "https://evil-attacker.com"},
            json={"data": "test"},
        )
        assert res_blocked.status_code == 403
        data = res_blocked.json()
        assert data["error"]["code"] == "CSRF_ORIGIN_FORBIDDEN"


@pytest.mark.asyncio
async def test_rate_limit_middleware(middleware_test_app):
    """Verify requests exceeding rate limit receive HTTP 429 and Retry-After header."""
    async with AsyncClient(
        transport=ASGITransport(app=middleware_test_app), base_url="http://test"
    ) as client:
        # Limit is 5 per minute in test fixture
        for _ in range(5):
            res = await client.get("/dummy")
            assert res.status_code == 200

        # 6th request must be rate limited
        res_limited = await client.get("/dummy")
        assert res_limited.status_code == 429
        assert "Retry-After" in res_limited.headers
        data = res_limited.json()
        assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
