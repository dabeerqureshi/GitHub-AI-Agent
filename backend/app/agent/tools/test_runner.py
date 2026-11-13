"""Sandboxed Automated Test Runner for repository verification."""

import asyncio
import time
from pathlib import Path
from typing import Any

from app.core.config import get_settings


class TestRunner:
    """Executes repository test suites safely with timeouts and output capture."""

    __test__ = False

    def __init__(self, workspace_root: str | None = None, default_timeout_seconds: int = 30):
        settings = get_settings()
        self.workspace_root = Path(workspace_root or settings.WORKSPACE_DIR).resolve()
        self.timeout = default_timeout_seconds

    async def run_tests(
        self,
        owner: str,
        repo: str,
        framework: str = "auto",
        custom_command: str | None = None,
    ) -> dict[str, Any]:
        """Execute automated tests in the repository working directory."""
        repo_dir = (self.workspace_root / owner / repo).resolve()
        if not repo_dir.exists():
            return {
                "success": False,
                "error": f"Repository directory not found at {repo_dir}",
                "output": "",
            }

        # Determine test command if auto
        cmd = custom_command
        if not cmd:
            if (
                framework == "pytest"
                or (repo_dir / "pytest.ini").exists()
                or (repo_dir / "pyproject.toml").exists()
            ):
                cmd = "pytest"
            elif framework == "npm" or (repo_dir / "package.json").exists():
                cmd = "npm test"
            else:
                cmd = "pytest"

        start_time = time.time()
        try:
            # Safe async subprocess execution
            process = await asyncio.create_subprocess_shell(
                cmd,
                cwd=str(repo_dir),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=self.timeout)
                output = stdout.decode("utf-8", errors="replace") + stderr.decode(
                    "utf-8", errors="replace"
                )
                exit_code = process.returncode
            except TimeoutError:
                process.kill()
                return {
                    "success": False,
                    "error": f"Test execution timed out after {self.timeout} seconds",
                    "output": "TIMEOUT",
                    "duration_seconds": self.timeout,
                }

            duration = round(time.time() - start_time, 2)
            return {
                "success": exit_code == 0,
                "exit_code": exit_code,
                "command": cmd,
                "output": output,
                "duration_seconds": duration,
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "output": "",
                "duration_seconds": round(time.time() - start_time, 2),
            }
