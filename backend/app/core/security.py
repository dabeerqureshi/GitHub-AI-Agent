"""Security utilities for action hashing, secret masking, and validation."""

import hashlib
import hmac
import json
import re
from typing import Any


def generate_action_hash(tool_name: str, payload: dict[str, Any], context_id: str) -> str:
    """
    Generate a cryptographic SHA-256 hash uniquely binding an action and its payload.

    Ensures that any alteration to tool parameters or target context invalidates approval.
    """
    normalized_json = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    content = f"{context_id}:{tool_name}:{normalized_json}"
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def verify_action_hash(
    provided_hash: str,
    tool_name: str,
    payload: dict[str, Any],
    context_id: str,
) -> bool:
    """Verify that the provided hash matches the computed action hash."""
    expected_hash = generate_action_hash(tool_name, payload, context_id)
    return hmac.compare_digest(provided_hash, expected_hash)


SECRET_PATTERNS = [
    re.compile(r"ghp_[A-Za-z0-9_]{36,255}"),  # GitHub Personal Access Token (classic)
    re.compile(r"github_pat_[A-Za-z0-9_]{82}"),  # GitHub Fine-Grained Token
    re.compile(r"sk-[A-Za-z0-9]{32,64}"),  # OpenAI API Key
    re.compile(r"sk-ant-[A-Za-z0-9_\-]{32,100}"),  # Anthropic API Key
]


def redact_secrets(text: str) -> str:
    """Redact sensitive API keys and tokens from logs or error outputs."""
    if not isinstance(text, str):
        return text
    result = text
    for pattern in SECRET_PATTERNS:
        result = pattern.sub("[REDACTED_SECRET]", result)
    return result
