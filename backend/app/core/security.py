"""Security utilities for action hashing, token encryption, secret masking, and prompt injection defense."""

import base64
import hashlib
import hmac
import json
import re
from typing import Any

from cryptography.fernet import Fernet

from app.core.config import get_settings


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


def _derive_fernet_key(secret: str | None = None) -> bytes:
    """Derive a URL-safe 32-byte base64-encoded key from a secret string."""
    raw_secret = secret or get_settings().SECRET_KEY
    key_hash = hashlib.sha256(raw_secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(key_hash)


def encrypt_token(plain_text: str, secret_key: str | None = None) -> str:
    """Encrypt a sensitive token or secret string using AES (Fernet)."""
    if not plain_text:
        return ""
    key = _derive_fernet_key(secret_key)
    f = Fernet(key)
    return f.encrypt(plain_text.encode("utf-8")).decode("utf-8")


def decrypt_token(cipher_text: str, secret_key: str | None = None) -> str:
    """Decrypt an encrypted token or secret string using AES (Fernet)."""
    if not cipher_text:
        return ""
    key = _derive_fernet_key(secret_key)
    f = Fernet(key)
    return f.decrypt(cipher_text.encode("utf-8")).decode("utf-8")


def verify_secret_token(provided_token: str, expected_token: str) -> bool:
    """Constant-time token validation preventing timing side-channel attacks."""
    if not provided_token or not expected_token:
        return False
    return hmac.compare_digest(provided_token.strip(), expected_token.strip())


def mask_secret(secret: str, visible_start: int = 10, visible_end: int = 4) -> str:
    """Mask sensitive tokens preserving prefix and suffix characters for UI inspection."""
    if not secret:
        return ""
    if len(secret) <= visible_start + visible_end:
        return "********"
    return f"{secret[:visible_start]}...{secret[-visible_end:]}"


SECRET_PATTERNS = [
    re.compile(r"ghp_[A-Za-z0-9_]{36,255}"),  # GitHub Personal Access Token (classic)
    re.compile(r"github_pat_[A-Za-z0-9_]{82}"),  # GitHub Fine-Grained Token
    re.compile(r"gh[ousr]_[A-Za-z0-9_]{36,255}"),  # GitHub OAuth / User / Refresh tokens
    re.compile(r"sk-[A-Za-z0-9]{32,64}"),  # OpenAI API Key
    re.compile(r"sk-or-v1-[A-Za-z0-9]{64}"),  # OpenRouter API Key
    re.compile(r"sk-ant-[A-Za-z0-9_\-]{32,100}"),  # Anthropic API Key
    re.compile(r"AKIA[0-9A-Z]{16}"),  # AWS Access Key ID
    re.compile(
        r"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"
    ),
    re.compile(
        r"Bearer\s+[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_.+/=]*"
    ),  # JWT / Bearer tokens
]


def redact_secrets(text: str) -> str:
    """Redact sensitive API keys, tokens, and private keys from logs or error outputs."""
    if not isinstance(text, str):
        return text
    result = text
    for pattern in SECRET_PATTERNS:
        result = pattern.sub("[REDACTED_SECRET]", result)
    return result


PROMPT_INJECTION_INDICATORS = [
    re.compile(r"ignore\s+(?:all\s+)?(?:previous|above|prior)\s+instructions", re.IGNORECASE),
    re.compile(
        r"disregard\s+(?:all\s+)?(?:previous|above|prior)\s+(?:rules|instructions)", re.IGNORECASE
    ),
    re.compile(r"system\s+prompt\s+override", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(?:an?\s+)?unfiltered", re.IGNORECASE),
    re.compile(r"bypass\s+(?:all\s+)?safety\s+guidelines", re.IGNORECASE),
    re.compile(r"<\|(?:im_start|im_end|system)\|>", re.IGNORECASE),
    re.compile(r"reveal\s+(?:your\s+)?system\s+prompt", re.IGNORECASE),
    re.compile(r"exfiltrate\s+(?:tokens|keys|secrets|passwords)", re.IGNORECASE),
]


def detect_prompt_injection(prompt: str) -> dict[str, Any]:
    """Inspect user prompt for known adversarial prompt injection, jailbreak, or exfiltration patterns."""
    if not isinstance(prompt, str):
        return {"is_injection": False, "matched_pattern": None}

    lower_prompt = prompt.lower()
    for pattern in PROMPT_INJECTION_INDICATORS:
        match = pattern.search(lower_prompt)
        if match:
            return {
                "is_injection": True,
                "matched_pattern": match.group(0),
                "severity": "HIGH",
            }

    return {"is_injection": False, "matched_pattern": None}
