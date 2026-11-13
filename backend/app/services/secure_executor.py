"""Restricted Subprocess Execution Engine with Command Allowlisting and Security Isolation."""

import asyncio
import os
import re
import signal
import sys
import time
from pathlib import Path

from pydantic import BaseModel


class SecurityViolationException(Exception):
    """Raised when an unapproved, arbitrary, or malicious command is executed."""

    pass


class ExecutionResult(BaseModel):
    """Result of sandboxed command execution."""

    success: bool
    exit_code: int
    command: str
    output: str
    duration_seconds: float
    timed_out: bool = False
    error: str | None = None


# Strict allowlist of safe test and verification commands
ALLOWED_COMMAND_PREFIXES = (
    "pytest",
    "python -m pytest",
    "python3 -m pytest",
    "npm test",
    "npm run test",
    "vitest run",
    "python -m unittest",
    "ruff check",
    "npm run typecheck",
    "tsc --noEmit",
)

# Sensitive environment variables stripped before execution
SENSITIVE_ENV_PATTERNS = re.compile(
    r"(TOKEN|SECRET|KEY|PASSWORD|AUTH|CREDENTIAL|DATABASE_URL|DATABASE)",
    re.IGNORECASE,
)

# Disallowed dangerous shell operators and characters
DANGEROUS_OPERATORS = re.compile(r"[;&|`$><]")


class SecureCodeExecutor:
    """Restricted execution engine enforcing command allowlisting and environment isolation."""

    def __init__(self, default_timeout_seconds: int = 30):
        self.default_timeout = default_timeout_seconds

    def validate_command(self, command: str) -> str:
        """Validate that command strictly matches an allowlisted test runner and contains no shell injection."""
        clean_cmd = command.strip()

        # Reject empty
        if not clean_cmd:
            raise SecurityViolationException("Execution of empty command is disallowed.")

        # Reject dangerous shell chaining / injection operators
        if DANGEROUS_OPERATORS.search(clean_cmd):
            raise SecurityViolationException(
                f"Command contains prohibited shell operators or redirections: '{clean_cmd}'."
            )

        # Allowlist matching
        is_allowed = any(clean_cmd.startswith(prefix) for prefix in ALLOWED_COMMAND_PREFIXES)
        if not is_allowed:
            raise SecurityViolationException(
                f"Command '{clean_cmd}' is not in the approved verification allowlist: {ALLOWED_COMMAND_PREFIXES}"
            )

        return clean_cmd

    def build_sanitized_environment(self) -> dict[str, str]:
        """Strip all GitHub tokens, API keys, and sensitive environment variables."""
        sanitized = {}
        for key, value in os.environ.items():
            if not SENSITIVE_ENV_PATTERNS.search(key):
                sanitized[key] = value

        # Ensure virtualenv bin is in PATH so installed test runners (pytest, etc.) are available
        venv_bin = str(Path(sys.prefix) / "bin")
        current_path = sanitized.get("PATH", "")
        if venv_bin not in current_path:
            sanitized["PATH"] = f"{venv_bin}:{current_path}"

        # Ensure local working directory is in PYTHONPATH for Python test execution
        current_pythonpath = sanitized.get("PYTHONPATH", "")
        sanitized["PYTHONPATH"] = f".:{current_pythonpath}".strip(":")

        # Explicit overrides for isolation
        sanitized["CI"] = "true"
        sanitized["PYTHONUNBUFFERED"] = "1"
        sanitized["NO_PROXY"] = "*"
        return sanitized

    async def execute(
        self,
        command: str,
        cwd: Path | str,
        timeout: int | None = None,
    ) -> ExecutionResult:
        """Execute allowlisted command inside target workspace directory with timeout and isolation."""
        validated_cmd = self.validate_command(command)
        working_dir = Path(cwd).resolve()
        if not working_dir.exists() or not working_dir.is_dir():
            raise FileNotFoundError(f"Working directory does not exist: {working_dir}")

        timeout_sec = timeout or self.default_timeout
        sanitized_env = self.build_sanitized_environment()
        start_time = time.time()

        # Use subprocess with new process group on POSIX
        use_preexec = sys.platform != "win32"
        preexec_fn = os.setsid if use_preexec else None

        try:
            process = await asyncio.create_subprocess_shell(
                validated_cmd,
                cwd=str(working_dir),
                env=sanitized_env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                preexec_fn=preexec_fn,
            )

            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout_sec)
                output = (
                    stdout.decode("utf-8", errors="replace")
                    + stderr.decode("utf-8", errors="replace")
                ).strip()
                exit_code = process.returncode or 0
                duration = round(time.time() - start_time, 2)

                return ExecutionResult(
                    success=exit_code == 0,
                    exit_code=exit_code,
                    command=validated_cmd,
                    output=output,
                    duration_seconds=duration,
                    timed_out=False,
                )

            except TimeoutError:
                # Terminate entire process group
                if use_preexec and process.pid:
                    try:
                        os.killpg(os.getpgid(process.pid), signal.SIGKILL)
                    except Exception:
                        pass
                else:
                    process.kill()

                duration = round(time.time() - start_time, 2)
                return ExecutionResult(
                    success=False,
                    exit_code=-1,
                    command=validated_cmd,
                    output=f"Execution timed out after {timeout_sec} seconds.",
                    duration_seconds=duration,
                    timed_out=True,
                    error="Timeout",
                )

        except Exception as e:
            duration = round(time.time() - start_time, 2)
            return ExecutionResult(
                success=False,
                exit_code=-1,
                command=validated_cmd,
                output="",
                duration_seconds=duration,
                timed_out=False,
                error=str(e),
            )
