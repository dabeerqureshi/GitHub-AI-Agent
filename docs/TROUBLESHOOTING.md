# Troubleshooting & Operational Guide — GitHub AI Workspace

This guide outlines common diagnostic scenarios, operational edge cases, and step-by-step resolutions.

---

## 1. Quick Diagnostic Checklist

Run the automated verification script:
```bash
./scripts/verify_deployment.sh http://localhost:8000 http://localhost:3000
```

Inspect detailed backend runtime diagnostics:
```bash
curl -s http://localhost:8000/api/v1/status | jq .
```

---

## 2. Common Issues & Solutions

### A. MCP Server Connection / Stdio Failures

**Symptoms**:
- `MCP connection failed` or `Command not found: npx`.
- GitHub tool executions return mock or fallback responses.

**Root Causes & Fixes**:
1. **Node.js/npm not in PATH**:
   Ensure `npx` is available on the system PATH:
   ```bash
   which npx
   npx -v
   ```
2. **Missing or Expired GitHub Token**:
   Ensure `GITHUB_PERSONAL_ACCESS_TOKEN` is set in your `.env` file with proper scopes.
   Verify the token manually:
   ```bash
   curl -H "Authorization: Bearer $GITHUB_PERSONAL_ACCESS_TOKEN" https://api.github.com/user
   ```
3. **Containerized MCP Execution**:
   If running in Docker, verify `nodejs` and `npm` are installed in the backend container (`docker/Dockerfile.backend`). In `docker-compose.prod.yml`, the backend image includes Node.js and Git by default.

---

### B. Ollama Connection or Model Not Found

**Symptoms**:
- Errors like `Failed to connect to Ollama at http://localhost:11434` or `Model 'qwen2.5-coder:7b' not found`.

**Root Causes & Fixes**:
1. **Ollama Service Not Running**:
   Check if the daemon is active:
   ```bash
   curl http://localhost:11434/api/tags
   ```
   If down, start the Ollama service:
   ```bash
   ollama serve
   ```
2. **Model Not Pulled**:
   Pull the model specified in `OLLAMA_MODEL` (`.env`):
   ```bash
   ollama pull qwen2.5-coder:7b
   ```
3. **Docker Networking (host.docker.internal)**:
   When running backend inside Docker Compose, Ollama on the host machine must be accessed via `http://host.docker.internal:11434`.
   Ensure `extra_hosts` with `host-gateway` is configured in `docker-compose.yml`.

---

### C. Git Worktree Lock / Containment Contention

**Symptoms**:
- `GitCommandError: fatal: cannot lock ref` or `Worktree already exists`.

**Root Causes & Fixes**:
1. **Orphaned Worktrees**:
   If a task was forcefully terminated mid-execution, an isolated worktree under `.workspaces/isolated_worktrees/` may still be registered with Git.
   Prune stale worktrees:
   ```bash
   cd backend/storage/workspaces/<owner>/<repo>
   git worktree prune
   ```
2. **Worktree Directory Cleanup**:
   Remove unmanaged temporary worktree folders:
   ```bash
   rm -rf backend/storage/workspaces/isolated_worktrees/*
   ```

---

### D. SQLite Database Locking or WAL Issues

**Symptoms**:
- `sqlite3.OperationalError: database is locked`.

**Root Causes & Fixes**:
1. **WAL Mode Inactive**:
   Ensure the database is running in Write-Ahead Logging mode, which supports concurrent reads and non-blocking writes:
   ```bash
   sqlite3 backend/storage/github_agent.db "PRAGMA journal_mode=WAL;"
   ```
2. **Truncate WAL File**:
   Execute a manual WAL truncate checkpoint:
   ```bash
   sqlite3 backend/storage/github_agent.db "PRAGMA wal_checkpoint(TRUNCATE);"
   ```
3. **Database Integrity Check**:
   Verify the database has not been corrupted:
   ```bash
   sqlite3 backend/storage/github_agent.db "PRAGMA integrity_check;"
   ```

---

### E. API Rate Limiting (HTTP 429)

**Symptoms**:
- Client requests receive `429 Too Many Requests` with a `Retry-After` header.

**Root Causes & Fixes**:
- The backend enforces sliding-window rate limiting via `RateLimitMiddleware`.
- Increase `RATE_LIMIT_PER_MINUTE` in `.env` (default: 60 for dev, 120 for prod).
- Health probes (`/healthz`, `/readyz`) are excluded from rate limits by design.

---

### F. CSRF Forbidden Errors (HTTP 403)

**Symptoms**:
- `{"error": {"code": "CSRF_ORIGIN_FORBIDDEN"}}` on POST/PUT requests.

**Root Causes & Fixes**:
- Mutating endpoints validate that the `Origin` or `Referer` header matches `ALLOWED_ORIGINS` or `FRONTEND_URL`.
- If accessing via a custom domain or reverse proxy, update `ALLOWED_ORIGINS` in `.env`:
  ```ini
  ALLOWED_ORIGINS=["http://localhost:3000","https://ai.yourdomain.com"]
  ```
