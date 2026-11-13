"""Unit tests for security utilities."""

from app.core.security import generate_action_hash, redact_secrets, verify_action_hash


def test_generate_action_hash_deterministic():
    """Verify identical parameters produce identical cryptographic hashes."""
    payload = {"repo": "owner/repo", "branch": "fix-bug", "message": "fix: resolve bug"}
    h1 = generate_action_hash("git_commit", payload, "step-1")
    h2 = generate_action_hash("git_commit", payload, "step-1")
    assert h1 == h2
    assert len(h1) == 64


def test_verify_action_hash_detects_tampering():
    """Verify parameter or step_id tampering fails verification."""
    payload = {"repo": "owner/repo", "branch": "fix-bug"}
    h = generate_action_hash("git_commit", payload, "step-1")

    # Valid
    assert verify_action_hash(h, "git_commit", payload, "step-1") is True

    # Tampered tool
    assert verify_action_hash(h, "git_push", payload, "step-1") is False

    # Tampered payload
    tampered_payload = {"repo": "owner/repo", "branch": "malicious-branch"}
    assert verify_action_hash(h, "git_commit", tampered_payload, "step-1") is False

    # Tampered step_id
    assert verify_action_hash(h, "git_commit", payload, "step-2") is False


def test_redact_secrets():
    """Verify secrets are redacted from output strings."""
    text = (
        "Using token ghp_1234567890abcdefghijklmnopqrstuvwxyz and "
        "OpenAI key sk-12345678901234567890123456789012 for request"
    )
    redacted = redact_secrets(text)
    assert "ghp_" not in redacted
    assert "sk-" not in redacted
    assert "[REDACTED_SECRET]" in redacted
