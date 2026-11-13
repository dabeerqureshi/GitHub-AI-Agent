"""Structured JSON logging configuration with secret redaction and correlation IDs."""

import json
import logging
import sys
from contextvars import ContextVar
from datetime import UTC, datetime
from typing import Any

from app.core.security import redact_secrets

# ContextVar storing current request correlation / trace ID
correlation_id_ctx: ContextVar[str] = ContextVar("correlation_id_ctx", default="")


class StructuredJsonFormatter(logging.Formatter):
    """Formats log records as JSON objects for structured log aggregation."""

    def format(self, record: logging.LogRecord) -> str:
        # Base structured fields
        log_entry: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": redact_secrets(record.getMessage()),
        }

        # Attach request correlation ID if available in context
        cid = correlation_id_ctx.get()
        if cid:
            log_entry["correlation_id"] = cid

        # Capture exception trace if present
        if record.exc_info:
            log_entry["exception"] = redact_secrets(self.formatException(record.exc_info))

        # Include any custom extra attributes
        for key, val in record.__dict__.items():
            if key not in (
                "args",
                "asctime",
                "created",
                "exc_info",
                "exc_text",
                "filename",
                "funcName",
                "levelname",
                "levelno",
                "lineno",
                "module",
                "msecs",
                "message",
                "msg",
                "name",
                "pathname",
                "process",
                "processName",
                "relativeCreated",
                "stack_info",
                "thread",
                "threadName",
            ):
                log_entry[key] = val

        return json.dumps(log_entry)


def configure_logging(app_env: str = "production", debug: bool = False) -> None:
    """Configure root logger with structured formatting in production or colored in development."""
    root_logger = logging.getLogger()
    level = logging.DEBUG if debug else logging.INFO
    root_logger.setLevel(level)

    # Remove existing handlers
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)

    if app_env.lower() in ("production", "prod", "staging"):
        console_handler.setFormatter(StructuredJsonFormatter())
    else:
        # Development clean formatter
        dev_formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%H:%M:%S",
        )
        console_handler.setFormatter(dev_formatter)

    root_logger.addHandler(console_handler)

    # Silence excessively verbose external loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
