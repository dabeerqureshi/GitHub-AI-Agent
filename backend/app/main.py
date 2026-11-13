"""Main FastAPI application entrypoint with production hardening, structured logging, and security middleware."""

import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1 import api_v1_router
from app.api.v1.health import health_check, readiness_check
from app.core.config import get_settings
from app.core.database import AsyncSessionLocal, get_db
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import (
    CorrelationIdMiddleware,
    CSRFProtectionMiddleware,
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
)
from app.services.recovery_service import ExecutionRecoveryService

logger = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Application lifespan context manager handling initialization, recovery, and graceful shutdown."""
    settings = get_settings()

    # 1. Initialize logging
    configure_logging(app_env=settings.APP_ENV, debug=settings.APP_DEBUG)
    logger.info(
        "GitHub AI Workspace Backend initialized (env=%s, provider=%s)",
        settings.APP_ENV,
        settings.DEFAULT_AI_PROVIDER,
    )

    # 2. Restart recovery: scan for interrupted execution runs from prior process lifecycle
    try:
        async with AsyncSessionLocal() as db:
            recovery = ExecutionRecoveryService(db)
            interrupted = await recovery.detect_and_handle_interrupted_runs()
            if interrupted:
                logger.warning(
                    "Flagged %d interrupted run(s) from prior session for recovery.",
                    len(interrupted),
                )
    except Exception as e:
        logger.error("Could not check interrupted runs on startup: %s", str(e))

    yield

    # 3. Graceful shutdown
    logger.info("GitHub AI Workspace Backend shutting down gracefully")


def create_app() -> FastAPI:
    """Create and configure the hardened FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="GitHub AI Workspace API",
        description="Production-grade backend for local-first GitHub management and coding agent",
        version="1.0.0",
        lifespan=lifespan,
    )

    # Register global standardized error handlers
    register_exception_handlers(app, app_env=settings.APP_ENV)

    # Middleware stack (applied in reverse order of addition)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        RateLimitMiddleware,
        requests_per_minute=max(10, settings.RATE_LIMIT_PER_MINUTE * 2),
    )
    app.add_middleware(CSRFProtectionMiddleware, allowed_origins=settings.ALLOWED_ORIGINS)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(CorrelationIdMiddleware)

    # Register API v1 routes
    app.include_router(api_v1_router)

    # Top-level probes for container orchestrators (Kubernetes / Docker Compose)
    @app.get("/healthz", tags=["System"], summary="Liveness probe")
    async def root_health(db: AsyncSession = Depends(get_db)):
        return await health_check(db=db)

    @app.get("/readyz", tags=["System"], summary="Readiness probe")
    async def root_ready(response: Response, db: AsyncSession = Depends(get_db)):
        return await readiness_check(response=response, db=db)

    return app


app = create_app()
