"""API v1 router assembly."""

from fastapi import APIRouter

from app.api.v1.approvals import router as approvals_router
from app.api.v1.audit import router as audit_router
from app.api.v1.chat import router as chat_router
from app.api.v1.health import router as health_router
from app.api.v1.intelligence import router as intelligence_router
from app.api.v1.memory import router as memory_router
from app.api.v1.repos import router as repos_router
from app.api.v1.runs import router as runs_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(health_router)
api_v1_router.include_router(repos_router)
api_v1_router.include_router(approvals_router)
api_v1_router.include_router(audit_router)
api_v1_router.include_router(chat_router)
api_v1_router.include_router(intelligence_router)
api_v1_router.include_router(memory_router)
api_v1_router.include_router(runs_router)
