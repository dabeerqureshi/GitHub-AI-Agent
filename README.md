# GitHub AI Workspace

A production-quality, local-first, hybrid AI-powered GitHub management and autonomous coding agent web application.

[![Backend Tests](https://img.shields.io/badge/backend%20tests-138%20passed-emerald)](backend/tests/)
[![Frontend Tests](https://img.shields.io/badge/frontend%20tests-12%20passed-emerald)](frontend/src/test/)
[![Python](https://img.shields.io/badge/python-3.12-blue)](backend/)
[![Next.js](https://img.shields.io/badge/next.js-15%20App%20Router-black)](frontend/)
[![License](https://img.shields.io/badge/license-MIT-purple)](#license)

---

## 1. System Overview & Architecture

GitHub AI Workspace allows software engineering teams to manage repositories, triage issues, review pull requests, analyze Git history, execute CI/CD diagnostics, and autonomously fix bugs using natural language through an interactive web interface.

### Architectural Principles
- **Local-First & Hybrid AI**: Defaults to 100% local operation with **Ollama** (`qwen2.5-coder:7b`). Cloud providers (**OpenAI**, **Anthropic**) are strictly optional and gated behind privacy policies.
- **Official GitHub MCP Integration**: Communicates with GitHub via the official GitHub Model Context Protocol (MCP) server, discovering available tools at runtime.
- **Stateful LangGraph Orchestrator**: Multi-step graph engine with intent classification, task planning, tool execution, output verification, and LangGraph SQLite checkpoint persistence.
- **Strict Human-in-the-Loop (HITL)**: All mutating operations (creating/editing issues, comments, opening PRs, merging, rerunning workflows, pushing branches) require user approval bound to a cryptographic SHA-256 action hash.
- **Worktree Sandboxing & Subprocess Isolation**: Autonomous code changes are applied only within isolated Git worktrees under strict path containment and disk quota enforcement. Test execution runs inside a restricted subprocess environment with command allowlisting and shell injection defenses.
- **Structured Observability**: Structured JSON logging with trace correlation IDs (`X-Correlation-ID`), secret redaction, audit logging, and liveness/readiness probes (`/healthz`, `/readyz`).

```
+---------------------------------------------------------------------------------+
|                                Frontend (Next.js 15)                            |
|    - Modern Web UI (TypeScript, Tailwind CSS, shadcn/ui, Lucide icons)          |
|    - Server-Sent Events (SSE) live streaming with automatic reconnection        |
|    - Approval Center (/approvals) with cryptographic hash verification          |
|    - Execution Timeline (/runs) with restart recovery & state resumption        |
|    - Syntax-highlighted Diff Viewer with line additions/deletions               |
+---------------------------------------------------------------------------------+
                                       |
                                       v  HTTP / SSE (CORS, CSRF, Rate Limiting)
+---------------------------------------------------------------------------------+
|                                Backend (FastAPI / Python 3.12)                  |
|    - Async SQLAlchemy 2.0 with SQLite in Write-Ahead Logging (WAL) mode         |
|    - Security Middlewares: Correlation IDs, Rate Limiting, CSRF, Secure Headers|
|    - Centralized Approval Engine with TTL & single-use execution nonces         |
|    - Token Encryption (AES-Fernet) & Regex Secret Redaction                     |
|    - LangGraph SQLite Checkpointing (AsyncSqliteSaver)                          |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
|                        LangGraph Unified Orchestrator                           |
|      Intent -> Specialized Persona -> Dynamic Plan -> HITL Gate -> Execute      |
+---------------------------------------------------------------------------------+
          |                                                 |
          v                                                 v
+-----------------------------+               +-----------------------------------+
|      Model Router           |               |       Tool Execution Layer        |
|  - Ollama (Local Default)   |               |  - GitHub MCP Client (Stdio)      |
|  - OpenAI / Anthropic       |               |  - Sandboxed Git Workspace Mgr    |
|  - Cloud Privacy Guardrail  |               |  - Restricted Subprocess Runner   |
+-----------------------------+               |  - Repo Intelligence & Search     |
                                              +-----------------------------------+
```

---

## 2. Specialized Roles & Advanced Workflows

Under a single unified LangGraph orchestrator, GitHub AI Workspace implements 6 specialized engineering roles and 12 production workflows:

### Specialized Personas
1. **Repository Analyst**: Structural audits, technical debt detection, code duplication scans, and dependency manifests.
2. **Issue Manager**: Issue triage, automated prioritization, label management, and release changelog compilation.
3. **Pull Request Reviewer**: Multi-PR batch analysis, security auditing, and merge policy verification.
4. **Coding Agent**: Autonomous bug investigation, multi-file feature implementation, and test generation in isolated worktrees.
5. **Git Operations Agent**: Branch divergence analysis, commit regression tracking, and conflict risk calculation.
6. **GitHub Actions Analyst**: CI/CD failure root-cause isolation and diagnostic remediation.

### 12 Advanced Workflows
| # | Workflow | Persona | Safety Level |
|---|---|---|---|
| 1 | **Analyze Entire Repository** | Repository Analyst | Safe Read |
| 2 | **Identify Technical Debt** | Repository Analyst | Safe Read |
| 3 | **Find Code Duplication** | Repository Analyst | Safe Read |
| 4 | **Investigate Production Bugs** | Coding Agent | Safe Read |
| 5 | **Analyze Commit Regressions** | Git Operations Agent | Safe Read |
| 6 | **Compare Branches** | Git Operations Agent | Safe Read |
| 7 | **Review Multiple PRs** | Pull Request Reviewer | Safe Read |
| 8 | **Diagnose CI Failures** | GitHub Actions Analyst | Safe Read |
| 9 | **Generate Development Plan** | Repository Analyst | Safe Read |
| 10 | **Implement Multi-File Feature** | Coding Agent | **Requires HITL Approval** |
| 11 | **Generate Tests for Code** | Coding Agent | Safe Read |
| 12 | **Prepare Release Summaries** | Issue Manager | Safe Read |

---

## 3. Quick Start & Installation

### Option A: Automated One-Click Setup (macOS / Linux)

```bash
git clone https://github.com/dabeerqureshi/GitHub-AI-Agent.git
cd GitHub-AI-Agent

# Run automated setup
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### Option B: Docker Compose (Production Hardened)

```bash
cp .env.production.example .env.production
# Edit .env.production with your SECRET_KEY and GITHUB_PERSONAL_ACCESS_TOKEN

docker compose -f docker-compose.prod.yml up --build -d
```

Verify deployment health:
```bash
./scripts/verify_deployment.sh http://localhost:8000 http://localhost:3000
```

Access the application:
- **Frontend Web UI**: [http://localhost:3000](http://localhost:3000)
- **Backend API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Liveness Probe**: [http://localhost:8000/healthz](http://localhost:8000/healthz)
- **Readiness Probe**: [http://localhost:8000/readyz](http://localhost:8000/readyz)
- **System Diagnostics**: [http://localhost:8000/api/v1/status](http://localhost:8000/api/v1/status)

For detailed manual installation instructions across Windows, macOS, and Linux, see the [Installation Guide](docs/INSTALLATION.md).

---

## 4. Verification & Testing

The workspace includes comprehensive test suites across all layers:

```bash
# Run all backend tests (138 tests)
PYTHONPATH=backend backend/.venv/bin/pytest backend/tests/ -v

# Run frontend test suite (12 tests)
npm --prefix frontend run test

# Run frontend typecheck & production build
npm --prefix frontend run typecheck && npm --prefix frontend run build

# Run linter and formatter
backend/.venv/bin/ruff check backend/ scripts/
backend/.venv/bin/ruff format --check backend/ scripts/
```

### Reliability & Autonomy Scorecard
Verified through our automated benchmark dataset (`backend/app/evaluation/`):
- **Tool Selection Accuracy**: `100.0%`
- **Repository Reference Accuracy**: `100.0%`
- **Approval Policy Compliance**: `100.0%`
- **Task Completion Rate**: `100.0%`
- **Invalid Action Rate**: `0.0%`
- **Composite Autonomy Readiness Score**: `97.67%`

---

## 5. Security & Safety Controls

- **Cryptographic Action Hashing**: Actions are signed with SHA-256 over `(step_id, tool_name, canonical_json_arguments)`. Any argument tampering immediately invalidates execution.
- **Single-Use Execution Nonces**: Nonces are burned upon resolution, strictly preventing replay attacks.
- **Path Traversal Defense**: Worktree paths are verified against directory containment boundaries.
- **Prompt Injection Defense**: Inbound messages are scanned for adversarial overrides, system prompts, or exfiltration markers.
- **Secret Redaction**: Classic PATs, Fine-Grained PATs, OAuth tokens, AWS keys, private keys, and JWTs are scrubbed from all logs and responses.
- **Token Encryption**: Sensitive tokens are encrypted at rest using AES (Fernet).

For full security architecture specifications, refer to [Security Architecture](docs/SECURITY.md).

---

## 6. Documentation Index

- [Installation Guide](docs/INSTALLATION.md): Complete setup instructions for all environments.
- [Security Architecture](docs/SECURITY.md): Threat model, HITL approval engine, sandboxing, and defenses.
- [Troubleshooting & Operations Guide](docs/TROUBLESHOOTING.md): Common error resolutions and maintenance.
- [Database Backup Script](scripts/backup_database.sh): Online hot backup tool for SQLite WAL database.
- [Database Restore Script](scripts/restore_database.sh): Verified database restore with integrity checking.
- [Smoke Test & Health Verifier](scripts/verify_deployment.sh): Deployment verification script.

---

## 7. License

MIT License. Developed for production-grade agentic GitHub automation.
