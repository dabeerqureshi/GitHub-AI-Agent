"""Health and system status API routes."""

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db

router = APIRouter(prefix="/healthz", tags=["System"])


@router.get("")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Comprehensive health check verifying DB connectivity and configuration."""
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
    }
