"""Main FastAPI application entrypoint."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_v1_router
from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.services.recovery_service import ExecutionRecoveryService


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Application lifespan context manager."""
    # Settings validation
    settings = get_settings()
    # Log startup state
    print(f"[STARTUP] GitHub AI Workspace Backend initialized (env={settings.APP_ENV})")

    # Restart recovery: scan for interrupted execution runs from prior process lifecycle
    try:
        async with AsyncSessionLocal() as db:
            recovery = ExecutionRecoveryService(db)
            interrupted = await recovery.detect_and_handle_interrupted_runs()
            if interrupted:
                print(
                    f"[RECOVERY] Flagged {len(interrupted)} interrupted run(s) from prior session for recovery."
                )
    except Exception as e:
        print(f"[RECOVERY_WARNING] Could not check interrupted runs on startup: {e}")

    yield
    print("[SHUTDOWN] GitHub AI Workspace Backend stopping")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="GitHub AI Workspace API",
        description="Backend API for local-first GitHub management and coding agent",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register API v1 routes
    app.include_router(api_v1_router)

    # Root health check for compatibility
    @app.get("/healthz", tags=["System"])
    async def root_health():
        return {"status": "ok", "service": "github-ai-workspace-backend"}

    return app


app = create_app()
