# Security Architecture & Guardrails — GitHub AI Workspace

This document defines the security boundaries, cryptographic controls, sandboxing policies, and defense-in-depth principles implemented across GitHub AI Workspace.

---

## 1. Threat Model & Security Principles

GitHub AI Workspace operates as a local-first, agentic assistant with access to GitHub repositories and local code modification tools. Its threat model enforces four core tenets:

1. **Zero Unapproved Side-Effects**: No external GitHub state mutation (issues, PRs, comments, branch creation, merges, workflow runs) or permanent disk changes may occur without human consent.
2. **Strict Isolation**: Code analysis, modification, and test execution must never mutate the user's primary working directory.
3. **Privacy by Default**: Private source code is never transmitted to third-party cloud AI providers without explicit configuration and consent.
4. **Secret Sanitization**: Secrets, API keys, and personal access tokens are scrubbed from logs, terminal outputs, and chat histories.

---

## 2. Human-In-The-Loop (HITL) Cryptographic Approval Engine

Every mutating operation (e.g. `create_issue`, `create_pull_request`, `push_and_create_pr`, `rerun_workflow`, `merge_pull_request`) pauses execution at an approval checkpoint.

### Cryptographic Action Binding
An approval record contains:
- `user_id`: Identity of the session owner.
- `step_id`: Unique execution step identifier.
- `tool_name`: Exact tool requested.
- `arguments`: Exact parameter dictionary.
- `action_hash`: Cryptographic SHA-256 hash binding context:
  $$\text{SHA-256}(\text{step\_id} : \text{tool\_name} : \text{canonical\_json}(\text{arguments}))$$
- `execution_nonce`: Single-use cryptographic nonce (`uuid4`).
- `expires_at`: Configurable TTL expiration (default: 30 minutes).

### Replay & Tamper Defenses
- **Payload Tampering**: If any argument is modified between approval presentation and execution, the action hash verification fails (`verify_action_hash`), immediately aborting the action.
- **Replay Attacks**: Once an approval is executed, its status transitions to `APPROVED` and its nonce is marked used. Repeated submission raises `DuplicateActionException` (HTTP 409).
- **Expiration**: Approvals past their TTL are automatically rejected with `ApprovalExpiredException`.

---

## 3. Workspace Isolation & Sandboxing

### Git Worktree Containment
- The agent does not directly touch the user's repository working directory.
- For all code modification workflows, the `CodingWorkspaceManager` spawns an isolated Git worktree under a designated storage root.
- Path Traversal Guard: Every path is checked via `_validate_path_containment`. Paths containing `..`, absolute escapes, or resolving outside the isolated worktree raise `GitSecurityException`.
- Quota Enforcement: Directory size is calculated before writes. Exceeding the workspace quota (default: 200MB) raises `DiskQuotaExceededException`.
- Automated Cleanup: Worktrees are pruned upon task completion or cancellation.

### Restricted Subprocess Execution
- Commands executed during test suites are restricted by `SecureCodeExecutor`.
- Allowlisted Commands: Only safe testing runners are permitted (`pytest`, `npm test`, `vitest run`, `cargo test`, `go test`, `make test`, `python -m pytest`).
- Shell Injection Defense: Metacharacters and command chaining operators (`;`, `&&`, `||`, `|`, `` ` ``, `$`, `>`, `<`) are rejected.
- Process Group Termination: Subprocesses are isolated in dedicated process groups (`os.setsid`) and terminated forcefully with `os.killpg(gid, signal.SIGKILL)` if execution exceeds the timeout (default: 60s).
- Environment Sanitization: GitHub tokens, OpenAI keys, and sensitive environment variables are stripped from the child process environment.

---

## 4. Privacy & Cloud Guardrails

- **Local-First Default**: The system defaults to local **Ollama** inference (`qwen2.5-coder:7b`). No data leaves the machine.
- **Private Code Detection**: Before routing any prompt to an optional cloud provider (OpenAI or Anthropic), the prompt is analyzed by `contains_private_code`.
- **Policy Enforcement**: If private code is detected and `ALLOW_CLOUD_CODE_ANALYSIS=false`, the system halts or forces local routing, raising a privacy alert.

---

## 5. Token Encryption & Secret Masking

- **At-Rest Token Encryption**: Sensitive tokens (GitHub PATs, session credentials) are encrypted using AES (Fernet) derived from `SECRET_KEY` via SHA-256 key stretching (`encrypt_token` / `decrypt_token`).
- **Secret Redaction**: Regex scrubbing (`redact_secrets`) runs across all log records, error messages, and stream responses, masking:
  - GitHub Classic PATs (`ghp_*`)
  - GitHub Fine-Grained PATs (`github_pat_*`)
  - GitHub OAuth Tokens (`gho_*`, `ghu_*`, `ghs_*`, `ghr_*`)
  - OpenAI API Keys (`sk-*`)
  - Anthropic API Keys (`sk-ant-*`)
  - AWS Access Keys (`AKIA*`)
  - Private Keys (`BEGIN RSA/OPENSSH/EC PRIVATE KEY`)
  - Bearer / JWT Tokens

---

## 6. Prompt Injection & Adversarial Defense

- Inbound messages pass through `detect_prompt_injection`.
- Detects instruction override attempts (`ignore previous instructions`, `disregard prior rules`), system tag spoofing (`<|im_start|>`, `<|system|>`), jailbreak markers (`you are now unfiltered`), and exfiltration attempts.
- When detected, the agent transitions to `SECURITY_INJECTION_BLOCKED`, halts tool execution, and responds with a security policy notification.

---

## 7. Web & API Security

- **Strict CORS**: Origin whitelist enforced via `CORSMiddleware`.
- **CSRF Protection**: Mutating methods (`POST`, `PUT`, `DELETE`, `PATCH`) validate `Origin` and `Referer` headers against allowed domains.
- **Security Headers**: Injects `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, and strict `Content-Security-Policy`.
- **Rate Limiting**: Sliding-window rate limiter protects endpoints against volumetric abuse.
- **Correlation Tracking**: Every request receives a unique `X-Correlation-ID` header attached to structured logs.
