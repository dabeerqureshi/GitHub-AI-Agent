"""Standardized API error models and global exception handlers."""

import logging
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import correlation_id_ctx
from app.core.security import redact_secrets

logger = logging.getLogger("api.errors")


def create_error_response(
    status_code: int,
    code: str,
    message: str,
    details: Any = None,
) -> JSONResponse:
    """Construct a uniform API error JSON response envelope."""
    cid = correlation_id_ctx.get() or "unknown"
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": redact_secrets(message),
                "correlation_id": cid,
                "details": details,
            }
        },
    )


def register_exception_handlers(app: FastAPI, app_env: str = "production") -> None:
    """Register uniform JSON error handlers on FastAPI application."""

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(_request: Request, exc: StarletteHTTPException):
        code_map = {
            status.HTTP_400_BAD_REQUEST: "BAD_REQUEST",
            status.HTTP_401_UNAUTHORIZED: "UNAUTHORIZED",
            status.HTTP_403_FORBIDDEN: "FORBIDDEN",
            status.HTTP_404_NOT_FOUND: "NOT_FOUND",
            status.HTTP_409_CONFLICT: "CONFLICT",
            status.HTTP_422_UNPROCESSABLE_CONTENT: "UNPROCESSABLE_CONTENT",
            status.HTTP_429_TOO_MANY_REQUESTS: "RATE_LIMITED",
            status.HTTP_500_INTERNAL_SERVER_ERROR: "INTERNAL_ERROR",
        }
        err_code = code_map.get(exc.status_code, "API_ERROR")
        return create_error_response(
            status_code=exc.status_code,
            code=err_code,
            message=str(exc.detail),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_request: Request, exc: RequestValidationError):
        details = [
            {
                "field": ".".join(str(loc) for loc in err.get("loc", [])),
                "issue": err.get("msg", ""),
                "type": err.get("type", ""),
            }
            for err in exc.errors()
        ]
        return create_error_response(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            code="VALIDATION_ERROR",
            message="Request parameters or body validation failed.",
            details=details,
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, exc: Exception):
        logger.exception("Unhandled server exception occurred: %s", str(exc))
        # In production, do not leak internal exception details to client
        msg = (
            "An unexpected internal server error occurred."
            if app_env.lower() in ("production", "prod")
            else str(exc)
        )
        return create_error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="INTERNAL_SERVER_ERROR",
            message=msg,
        )
