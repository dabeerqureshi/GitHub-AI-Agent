"""Dedicated sample Git repository fixture generator for Phase 4 Repository Intelligence testing."""

from pathlib import Path

import git


def create_sample_repository(
    base_dir: Path, owner: str = "testorg", repo_name: str = "sample-repo"
) -> tuple[Path, git.Repo]:
    """Create a fully featured test repository containing Python, TS, configs, docs, tests, and multiple branches."""
    repo_dir = base_dir / owner / repo_name
    repo_dir.mkdir(parents=True, exist_ok=True)

    repo = git.Repo.init(repo_dir)

    # Configure committer
    repo.config_writer().set_value("user", "name", "Test Committer").release()
    repo.config_writer().set_value("user", "email", "test@example.com").release()

    # 1. Documentation
    readme_path = repo_dir / "README.md"
    readme_path.write_text(
        "# Sample Project\n\nThis is a sample project for testing repository intelligence.\n\n## Features\n- Calculator\n- Authentication\n",
        encoding="utf-8",
    )

    arch_path = repo_dir / "ARCHITECTURE.md"
    arch_path.write_text(
        "# Architecture Overview\n\nModular design separating frontend, backend, and core calculations.\n",
        encoding="utf-8",
    )

    # 2. Configurations & Manifests
    reqs_path = repo_dir / "requirements.txt"
    reqs_path.write_text("fastapi>=0.115.0\nsqlalchemy>=2.0.0\npytest>=8.0.0\n", encoding="utf-8")

    pkg_path = repo_dir / "package.json"
    pkg_path.write_text(
        '{\n  "name": "sample-repo",\n  "version": "1.0.0",\n  "dependencies": {\n    "express": "^4.19.2",\n    "zod": "^3.23.0"\n  }\n}\n',
        encoding="utf-8",
    )

    dockerfile_path = repo_dir / "Dockerfile"
    dockerfile_path.write_text(
        'FROM python:3.12-slim\nWORKDIR /app\nCOPY . .\nCMD ["pytest"]\n', encoding="utf-8"
    )

    # 3. Python Source & Tests
    src_dir = repo_dir / "src"
    src_dir.mkdir(exist_ok=True)
    calc_path = src_dir / "calculator.py"
    calc_path.write_text(
        '"""Calculator module with arithmetic operations."""\n\nclass Calculator:\n    """A basic arithmetic calculator."""\n\n    def add(self, a: int, b: int) -> int:\n        """Return sum of a and b."""\n        return a + b\n\n    def multiply(self, a: int, b: int) -> int:\n        """Return product of a and b."""\n        return a * b\n',
        encoding="utf-8",
    )

    tests_dir = repo_dir / "tests"
    tests_dir.mkdir(exist_ok=True)
    test_calc_path = tests_dir / "test_calculator.py"
    test_calc_path.write_text(
        "from src.calculator import Calculator\n\ndef test_add():\n    calc = Calculator()\n    assert calc.add(2, 3) == 5\n",
        encoding="utf-8",
    )

    # 4. TypeScript Source
    ts_path = src_dir / "index.ts"
    ts_path.write_text(
        "export interface UserConfig {\n  apiUrl: string;\n  timeoutMs: number;\n}\n\nexport class ApiClient {\n  constructor(private config: UserConfig) {}\n}\n\nexport function initializeClient(config: UserConfig): ApiClient {\n  return new ApiClient(config);\n}\n",
        encoding="utf-8",
    )

    # Initial commit on main branch
    repo.git.checkout("-B", "main")
    repo.git.add(all=True)
    repo.index.commit("Initial commit with documentation, configs, Python, TS and tests")

    # Create feature branch
    feature_branch = repo.create_head("feature-auth")
    feature_branch.checkout()

    auth_path = src_dir / "auth.py"
    auth_path.write_text(
        '"""Authentication utilities."""\n\ndef verify_token(token: str) -> bool:\n    """Verify security token integrity."""\n    return token == "valid-token"\n\nclass UserSession:\n    """User session container."""\n    pass\n',
        encoding="utf-8",
    )
    repo.git.add("src/auth.py")
    repo.index.commit("feat(auth): add auth module and session handler")

    # Switch back to main
    repo.heads.main.checkout()

    return repo_dir, repo
