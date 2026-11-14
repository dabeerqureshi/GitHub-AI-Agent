"""Production security, rate limiting, correlation tracking, and CSRF protection middlewares."""

import time
import uuid
from collections import defaultdict
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import get_settings
from app.core.logging import correlation_id_ctx


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Assigns or propagates a unique correlation ID per request and binds it to context."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        cid = request.headers.get("X-Correlation-ID") or request.headers.get("X-Request-ID")
        if not cid:
            cid = f"req-{uuid.uuid4().hex[:12]}"

        # Set context variable for structured logging
        token = correlation_id_ctx.set(cid)
        try:
            response = await call_next(request)
            response.headers["X-Correlation-ID"] = cid
            return response
        finally:
            correlation_id_ctx.reset(token)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Enforces essential production security headers on all responses."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """In-memory sliding-window rate limiter protecting API endpoints from abuse."""

    def __init__(self, app: Any, requests_per_minute: int = 120):
        super().__init__(app)
        self.rpm = requests_per_minute
        self.window_seconds = 60
        self._history: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Exclude health checks and read-only system config metadata from rate limiting
        if request.url.path in (
            "/health",
            "/healthz",
            "/readyz",
            "/api/v1/health",
            "/api/v1/healthz",
            "/api/v1/models/config",
        ) and request.method == "GET":
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window_start = now - self.window_seconds

        # Prune old timestamps
        timestamps = [t for t in self._history[client_ip] if t > window_start]
        self._history[client_ip] = timestamps

        if len(timestamps) >= self.rpm:
            retry_after = int(self.window_seconds - (now - timestamps[0]))
            cid = correlation_id_ctx.get() or "unknown"
            return JSONResponse(
                status_code=429,
                headers={"Retry-After": str(max(1, retry_after))},
                content={
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": f"Too many requests. Limit is {self.rpm} requests per minute.",
                        "correlation_id": cid,
                        "retry_after_seconds": max(1, retry_after),
                    }
                },
            )

        self._history[client_ip].append(now)
        return await call_next(request)


class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """Validates Origin and Referer headers on state-mutating HTTP methods."""

    def __init__(self, app: Any, allowed_origins: list[str] | None = None):
        super().__init__(app)
        settings = get_settings()
        self.allowed = set(allowed_origins or settings.ALLOWED_ORIGINS)
        if settings.FRONTEND_URL:
            self.allowed.add(settings.FRONTEND_URL)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Check mutating methods only
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            origin = request.headers.get("origin")
            referer = request.headers.get("referer")

            # Check origin if provided
            if origin:
                clean_origin = origin.rstrip("/")
                is_valid = any(clean_origin == a.rstrip("/") for a in self.allowed)
                if not is_valid:
                    cid = correlation_id_ctx.get() or "unknown"
                    return JSONResponse(
                        status_code=403,
                        content={
                            "error": {
                                "code": "CSRF_ORIGIN_FORBIDDEN",
                                "message": f"Cross-origin request from '{origin}' is not permitted.",
                                "correlation_id": cid,
                            }
                        },
                    )

            # Check referer if origin not present
            elif referer:
                is_valid = any(referer.startswith(a.rstrip("/")) for a in self.allowed)
                if not is_valid:
                    cid = correlation_id_ctx.get() or "unknown"
                    return JSONResponse(
                        status_code=403,
                        content={
                            "error": {
                                "code": "CSRF_REFERER_FORBIDDEN",
                                "message": "Cross-origin referer is not permitted for state mutation.",
                                "correlation_id": cid,
                            }
                        },
                    )

        return await call_next(request)
