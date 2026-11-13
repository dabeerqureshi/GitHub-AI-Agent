"""Health, readiness, and system status API routes."""

import os
from pathlib import Path

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db

router = APIRouter(tags=["System"])


@router.get("/healthz", summary="Liveness check")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Liveness probe verifying that the backend application process is alive and responsive."""
    settings = get_settings()
    db_status = "unhealthy"
    try:
        result = await db.execute(text("SELECT 1"))
        if result.scalar() == 1:
            db_status = "healthy"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "ok" if db_status == "healthy" else "degraded",
        "service": "github-ai-workspace-backend",
        "database": db_status,
        "default_provider": settings.DEFAULT_AI_PROVIDER,
        "mcp_transport": settings.GITHUB_MCP_TRANSPORT,
        "liveness": True,
    }


@router.get("/readyz", summary="Readiness check")
async def readiness_check(response: Response, db: AsyncSession = Depends(get_db)):
    """Readiness probe checking database connectivity and storage workspace availability."""
    settings = get_settings()
    is_ready = True
    checks = {}

    # 1. Database check
    try:
        res = await db.execute(text("SELECT 1"))
        if res.scalar() == 1:
            checks["database"] = "healthy"
        else:
            checks["database"] = "unresponsive"
            is_ready = False
    except Exception as e:
        checks["database"] = f"error: {str(e)}"
        is_ready = False

    # 2. Storage workspace check
    try:
        workspace_dir = Path(settings.WORKSPACE_DIR)
        workspace_dir.mkdir(parents=True, exist_ok=True)
        test_file = workspace_dir / ".ready_probe"
        test_file.write_text("ok", encoding="utf-8")
        test_file.unlink(missing_ok=True)
        checks["storage"] = "writable"
    except Exception as e:
        checks["storage"] = f"unwritable: {str(e)}"
        is_ready = False

    # 3. Model provider configuration
    checks["ai_provider"] = {
        "default": settings.DEFAULT_AI_PROVIDER,
        "configured": True,
    }

    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ready" if is_ready else "not_ready",
        "service": "github-ai-workspace-backend",
        "checks": checks,
    }


@router.get("/status", summary="Detailed system diagnostics")
async def system_status(db: AsyncSession = Depends(get_db)):
    """Comprehensive diagnostic endpoint for operations and observability."""
    settings = get_settings()

    # Query SQLite WAL journal mode
    journal_mode = "unknown"
    try:
        res = await db.execute(text("PRAGMA journal_mode"))
        row = res.scalar()
        if row:
            journal_mode = str(row).upper()
    except Exception:
        pass

    # Disk usage in workspace dir
    workspace_dir = Path(settings.WORKSPACE_DIR)
    free_bytes = 0
    try:
        stat = os.statvfs(workspace_dir)
        free_bytes = stat.f_bavail * stat.f_frsize
    except Exception:
        pass

    return {
        "service": "github-ai-workspace-backend",
        "environment": settings.APP_ENV,
        "version": "1.0.0",
        "database": {
            "journal_mode": journal_mode,
            "wal_enabled": journal_mode == "WAL",
        },
        "workspace": {
            "path": settings.WORKSPACE_DIR,
            "free_space_mb": round(free_bytes / (1024 * 1024), 2),
        },
        "ai": {
            "provider": settings.DEFAULT_AI_PROVIDER,
            "ollama_model": settings.OLLAMA_MODEL,
            "cloud_analysis_allowed": settings.ALLOW_CLOUD_CODE_ANALYSIS,
        },
        "mcp": {
            "transport": settings.GITHUB_MCP_TRANSPORT,
            "command": settings.GITHUB_MCP_COMMAND,
        },
        "security": {
            "rate_limit_per_minute": settings.RATE_LIMIT_PER_MINUTE,
            "approval_required_for_mutations": settings.REQUIRE_APPROVAL_FOR_MUTATIONS,
        },
    }
