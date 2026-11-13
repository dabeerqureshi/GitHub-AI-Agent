# GitHub AI Workspace

A production-quality, local-first, hybrid AI-powered GitHub management and coding agent web application.

---

## 1. Overview & Architecture

GitHub AI Workspace allows software engineers to manage GitHub repositories, issues, pull requests, local Git operations, code reviews, debugging, and code modifications using natural language.

Key architecture principles:
- **Local-First & Hybrid AI**: Defaults to 100% local operation with **Ollama** models; seamlessly supports optional cloud providers (**OpenAI**, **Anthropic**) via a unified model router abstraction.
- **MCP-Native**: Uses the official GitHub Model Context Protocol (MCP) server as the primary GitHub interface via the MCP Python SDK, falling back to REST/GraphQL only for requirements not covered by MCP.
- **Stateful Agent Orchestration**: Orchestrated using **LangGraph** with state persistence and session tracking in SQLite.
- **Strict Security & Human-in-the-Loop (HITL)**: Read-only access by default; all external write operations (creating branches, commits, PRs, comments, merging, closing issues) require exact-action cryptographic approval binding before execution. Zero plaintext secrets in logs or frontend.
- **Local Git & Code Intelligence**: Sandboxed local repository workspace manager using GitPython for clone, branch, edit, diff, and automated test runs.

### System Diagram

```
+---------------------------------------------------------------------------------+
|                                Frontend (Next.js 15)                            |
|    - Modern Web UI (Tailwind CSS, shadcn/ui, Lucide icons)                      |
|    - Zustand State Store (Active session, repo, pending approvals)              |
|    - Interactive HITL Approval Card with SHA-256 Signature Verification         |
|    - Immutable Security Audit Log Dashboard                                     |
+---------------------------------------------------------------------------------+
                                       |
                                       v  HTTP / REST API
+---------------------------------------------------------------------------------+
|                                Backend (FastAPI / Python 3.12)                  |
|    - Async SQLAlchemy 2.0 with SQLite in Write-Ahead Logging (WAL) mode         |
|    - Alembic Schema Migrations                                                  |
|    - Cryptographic Action Signature Hashes (SHA-256)                            |
|    - Append-only Audit Event Store                                              |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
|                                LangGraph Agent Workflow                         |
|   Plan & Route -> Dynamic Tool Allowlist -> Approval Gate -> Execute -> Verify |
+---------------------------------------------------------------------------------+
          |                                                 |
          v                                                 v
+-----------------------------+               +-----------------------------------+
|      Model Router           |               |       Tool Execution Layer        |
|  - Ollama (Local Default)   |               |  - Official GitHub MCP Client     |
|  - OpenAI / Anthropic       |               |  - Sandboxed Local Git Manager    |
+-----------------------------+               |  - Subprocess Test Runner         |
                                              +-----------------------------------+
```

---

## 2. Technology Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui design tokens, Zustand, Vitest, Testing Library.
- **Backend**: Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0 (Async), aiosqlite, Alembic, Ruff, Pytest.
- **AI & Agent Orchestration**: LangGraph, LangChain Core, ModelRouter (Ollama, OpenAI, Anthropic).
- **GitHub & Tooling**: Official GitHub MCP (`@modelcontextprotocol/server-github`), MCP Python SDK, GitPython.
- **Infrastructure**: Docker, Docker Compose.

---

## 3. Security & Safety Model

1. **Credential Isolation**: GitHub Personal Access Tokens (PAT) and AI API keys are stored strictly in backend server environment variables. Neither tokens nor raw API keys are ever transmitted to the browser or written to stdout/debug logs.
2. **Untrusted Content Demarcation**: Repository contents, commit messages, PR bodies, and issues are demarcated with XML security boundary tags (`<untrusted_data>`). System directives forbid treating external repository files as role updates or prompt overrides.
3. **Exact-Action Approval Binding**:
   - Mutating operations (e.g. `create_issue`, `create_pull_request`, `git_commit`, `git_create_branch`) trigger a `NEEDS_APPROVAL` state.
   - The backend computes a SHA-256 signature hash over `(context_id, tool_name, normalized_json_payload)`.
   - The user must explicitly approve this exact action token. If parameters mutate or expire, execution is refused.
4. **Audit Logging**: All incoming user prompts, LLM tool selection requests, approval events, and tool outcomes are recorded in an append-only SQLite table with timestamp, user session ID, action hash, and result status.
5. **Path Traversal Defense**: The `LocalGitManager` verifies all workspace paths against the designated directory sandbox, rejecting any relative traversal attempts (`../../`).

---

## 4. Getting Started & Local Setup

### Prerequisites
- Node.js 22+
- Python 3.12+
- Git 2.50+
- (Optional for local AI) [Ollama](https://ollama.ai) with `qwen2.5-coder:7b` or `llama3.1:8b`

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/dabeerqureshi/GitHub-AI-Agent.git
   cd GitHub-AI-Agent
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env to set your GitHub token and preferred model settings
   ```

3. **Install dependencies**:
   ```bash
   make install
   ```

4. **Run database migrations**:
   ```bash
   cd backend && .venv/bin/alembic upgrade head
   ```

5. **Start development servers**:
   - Backend:
     ```bash
     make dev-backend
     # Running at http://localhost:8000 (OpenAPI docs at http://localhost:8000/docs)
     ```
   - Frontend:
     ```bash
     make dev-frontend
     # Running at http://localhost:3000
     ```

### Docker Deployment

To launch the full stack with Docker Compose:
```bash
docker-compose up --build
```

---

## 5. Verification & Testing

Run all test suites across frontend and backend:

```bash
# Run all tests
make test

# Run backend tests only
make test-backend

# Run frontend tests only
make test-frontend

# Run linter and formatting checks
make lint
```
