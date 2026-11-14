/**
 * Typed API client for GitHub AI Workspace Backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Conversation {
  id: string;
  title: string;
  active_repo: string | null;
  created_at: string;
  updated_at: string;
  messages: ConversationMessage[];
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: any[] | null;
  tool_call_id?: string | null;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  conversation_id: string;
  user_id?: string;
  repo_name?: string | null;
  step_id: string;
  tool_name: string;
  action_hash: string;
  description: string;
  payload: Record<string, any>;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "EXECUTED";
  execution_nonce?: string | null;
  expires_at?: string | null;
  is_executed?: boolean;
  executed_at?: string | null;
  reviewer_notes?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface ExecutionStep {
  step: string;
  status: string;
  details?: Record<string, any>;
  message?: string;
  timestamp: string;
}

export interface ExecutionRun {
  id: string;
  conversation_id: string;
  thread_id: string;
  repo_name?: string | null;
  status:
    | "PENDING"
    | "RUNNING"
    | "WAITING_APPROVAL"
    | "COMPLETED"
    | "FAILED"
    | "INTERRUPTED"
    | "CANCELLED";
  user_request: string;
  current_step?: string | null;
  step_history: ExecutionStep[];
  error_message?: string | null;
  retry_count: number;
  created_at: string;
  completed_at?: string | null;
}

export interface GitHubUserProfile {
  login: string;
  name?: string | null;
  avatar_url?: string | null;
  html_url?: string | null;
  public_repos: number;
  total_private_repos: number;
}

export interface GitHubAuthStatus {
  is_connected: boolean;
  user?: GitHubUserProfile | null;
  repo_count: number;
  masked_token?: string | null;
  provider_type: string;
}

export interface GitHubConnectResponse {
  status: string;
  message: string;
  user: GitHubUserProfile;
  synced_repositories: number;
}

export interface ProviderInfo {
  id: string;
  name: string;
  model: string;
  has_key: boolean;
  masked_key?: string | null;
  supported_models: string[];
  description: string;
}

export interface ModelsConfigResponse {
  active_provider: string;
  active_model: string;
  allow_cloud_code: boolean;
  providers: Record<string, ProviderInfo>;
}

export interface UpdateModelConfigRequest {
  provider: string;
  model?: string;
  api_key?: string;
  allow_cloud_code?: boolean;
}

export interface TestModelResponse {
  provider: string;
  model: string;
  is_available: boolean;
  supports_tool_calling: boolean;
  latency_ms: number;
  error_message?: string | null;
}

export interface RepositoryRecord {
  id: string;
  full_name: string;
  name: string;
  owner: string;
  description?: string | null;
  default_branch: string;
  is_private: boolean;
  is_cloned: boolean;
  local_path?: string | null;
  last_synced_at: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  event_type: string;
  conversation_id?: string | null;
  action_hash?: string | null;
  tool_name?: string | null;
  status: string;
  client_ip?: string | null;
  details: Record<string, any>;
  error_message?: string | null;
}

export interface FileBrowseItem {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  extension: string;
}

export interface FileContentWithLines {
  path: string;
  total_lines: number;
  start_line: number;
  end_line: number;
  content: string;
  citation: string;
}

export interface SearchResultItem {
  path: string;
  line_number: number;
  line_content: string;
  matched_term: string;
  citation: string;
}

export interface BranchComparison {
  base_branch: string;
  head_branch: string;
  ahead_by: number;
  behind_by: number;
  commits: Array<{
    sha: string;
    message: string;
    author: string;
    date: string;
  }>;
  changed_files: string[];
  diff_stat: string;
}

export interface ArchitectureSummary {
  full_name: string;
  commit_sha: string;
  primary_languages: string[];
  frameworks_detected: string[];
  verified_facts: string[];
  reasonable_inferences: string[];
  unknown_information: string[];
  markdown_report: string;
}

export interface RepoContextResponse {
  id: string;
  full_name: string;
  default_branch: string;
  last_indexed_commit_sha?: string | null;
  languages: string[];
  directory_tree: Record<string, any>;
  documentation_files: Array<Record<string, any>>;
  configuration_files: Array<Record<string, any>>;
  dependencies: Record<string, string[]>;
  symbols: Record<string, any>;
  architecture_summary?: string | null;
  last_refreshed_at: string;
}

export interface SendMessageResponse {
  status: "COMPLETED" | "NEEDS_APPROVAL";
  message?: ConversationMessage;
  approval?: ApprovalRequest;
  plan: string[];
}

export async function fetchHealth(): Promise<{
  status: string;
  database: string;
  default_provider: string;
  mcp_transport: string;
}> {
  const res = await fetch(`${API_BASE_URL}/api/v1/healthz`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/chat/conversations`);
  if (!res.ok) throw new Error("Failed to fetch conversations");
  return res.json();
}

export async function createConversation(title?: string, activeRepo?: string): Promise<Conversation> {
  const res = await fetch(`${API_BASE_URL}/api/v1/chat/conversations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, active_repo: activeRepo }),
  });
  if (!res.ok) throw new Error("Failed to create conversation");
  return res.json();
}

export async function fetchConversation(id: string): Promise<Conversation> {
  const res = await fetch(`${API_BASE_URL}/api/v1/chat/conversations/${id}`);
  if (!res.ok) throw new Error("Failed to load conversation");
  return res.json();
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/chat/conversations/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete conversation");
}

export async function sendMessage(
  conversationId: string,
  content: string,
  activeRepo?: string
): Promise<SendMessageResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, active_repo: activeRepo }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}

export async function fetchPendingApprovals(): Promise<ApprovalRequest[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/approvals/pending`);
  if (!res.ok) throw new Error("Failed to fetch approvals");
  return res.json();
}

export async function submitApprovalDecision(
  approvalId: string,
  actionHash: string,
  decision: "APPROVE" | "REJECT",
  reviewerNotes?: string
): Promise<ApprovalRequest> {
  const res = await fetch(`${API_BASE_URL}/api/v1/approvals/${approvalId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action_hash: actionHash,
      decision,
      reviewer_notes: reviewerNotes,
    }),
  });
  if (!res.ok) throw new Error("Failed to submit approval decision");
  return res.json();
}

export async function decideApproval(
  approvalId: string,
  params: {
    action_hash: string;
    decision: "APPROVE" | "REJECT";
    reviewer_notes?: string;
    user_id?: string;
  }
): Promise<ApprovalRequest> {
  return submitApprovalDecision(
    approvalId,
    params.action_hash,
    params.decision,
    params.reviewer_notes
  );
}

export async function fetchRepositories(): Promise<RepositoryRecord[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/repos`);
  if (!res.ok) throw new Error("Failed to fetch repositories");
  return res.json();
}

export async function refreshRepositories(): Promise<RepositoryRecord[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/repos/refresh`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to refresh repositories");
  return res.json();
}

export async function fetchGitHubAuthStatus(): Promise<GitHubAuthStatus> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/github/status`);
  if (!res.ok) throw new Error("Failed to fetch GitHub auth status");
  return res.json();
}

export async function connectGitHubToken(
  token: string,
  targetRepo?: string
): Promise<GitHubConnectResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/github`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, target_repo: targetRepo }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to connect token" }));
    throw new Error(err.detail || "Failed to connect GitHub token");
  }
  return res.json();
}

export async function disconnectGitHub(): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/github/disconnect`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to disconnect GitHub account");
  return res.json();
}

export async function fetchModelsConfig(): Promise<ModelsConfigResponse> {
  let res = await fetch(`${API_BASE_URL}/api/v1/models/config`);
  if (!res.ok && res.status === 429) {
    // Retry once after 1.5 seconds if temporarily throttled
    await new Promise((r) => setTimeout(r, 1500));
    res = await fetch(`${API_BASE_URL}/api/v1/models/config`);
  }
  if (!res.ok) throw new Error("Failed to fetch models configuration");
  return res.json();
}

export async function updateModelConfig(payload: UpdateModelConfigRequest): Promise<ModelsConfigResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/models/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to update model configuration" }));
    throw new Error(err.detail || "Failed to update model configuration");
  }
  return res.json();
}

export async function testModelConnection(payload: {
  provider: string;
  model?: string;
  api_key?: string;
}): Promise<TestModelResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/models/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to test model connection" }));
    throw new Error(err.detail || "Failed to test model connection");
  }
  return res.json();
}

export async function syncRepository(fullName: string): Promise<RepositoryRecord> {
  const res = await fetch(`${API_BASE_URL}/api/v1/repos/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ full_name: fullName }),
  });
  if (!res.ok) throw new Error("Failed to sync repository");
  return res.json();
}

export async function fetchAuditEvents(eventType?: string): Promise<AuditEvent[]> {
  const url = new URL(`${API_BASE_URL}/api/v1/audit`);
  if (eventType) url.searchParams.set("event_type", eventType);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch audit events");
  return res.json();
}

export async function fetchRepoContext(
  owner: string,
  repo: string,
  forceRefresh: boolean = false
): Promise<RepoContextResponse> {
  const url = `${API_BASE_URL}/api/v1/intelligence/${owner}/${repo}/context?force_refresh=${forceRefresh}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch repository context");
  return res.json();
}

export async function browseRepoFiles(
  owner: string,
  repo: string,
  path: string = ""
): Promise<FileBrowseItem[]> {
  const url = `${API_BASE_URL}/api/v1/intelligence/${owner}/${repo}/files?path=${encodeURIComponent(path)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to browse repository files");
  return res.json();
}

export async function fetchRepoFileContent(
  owner: string,
  repo: string,
  path: string,
  startLine?: number,
  endLine?: number
): Promise<FileContentWithLines> {
  const url = new URL(`${API_BASE_URL}/api/v1/intelligence/${owner}/${repo}/file`);
  url.searchParams.set("path", path);
  if (startLine) url.searchParams.set("start_line", startLine.toString());
  if (endLine) url.searchParams.set("end_line", endLine.toString());
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch file content");
  return res.json();
}

export async function searchRepoCode(
  owner: string,
  repo: string,
  query: string,
  limit: number = 50
): Promise<SearchResultItem[]> {
  const url = `${API_BASE_URL}/api/v1/intelligence/${owner}/${repo}/search?query=${encodeURIComponent(query)}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to search repository code");
  return res.json();
}

export async function compareRepoBranches(
  owner: string,
  repo: string,
  base: string = "main",
  head?: string
): Promise<BranchComparison> {
  const url = new URL(`${API_BASE_URL}/api/v1/intelligence/${owner}/${repo}/compare`);
  url.searchParams.set("base", base);
  if (head) url.searchParams.set("head", head);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to compare branches");
  return res.json();
}

export async function fetchRepoArchitectureSummary(
  owner: string,
  repo: string
): Promise<ArchitectureSummary> {
  const url = `${API_BASE_URL}/api/v1/intelligence/${owner}/${repo}/summary`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch architecture summary");
  return res.json();
}

export async function fetchAllApprovals(
  status?: string,
  conversationId?: string,
  limit: number = 50
): Promise<ApprovalRequest[]> {
  const url = new URL(`${API_BASE_URL}/api/v1/approvals`);
  if (status) url.searchParams.set("status", status);
  if (conversationId) url.searchParams.set("conversation_id", conversationId);
  url.searchParams.set("limit", limit.toString());
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch approvals");
  return res.json();
}

export async function fetchExecutionRuns(
  status?: string,
  conversationId?: string,
  limit: number = 50
): Promise<ExecutionRun[]> {
  const url = new URL(`${API_BASE_URL}/api/v1/runs`);
  if (status) url.searchParams.set("status", status);
  if (conversationId) url.searchParams.set("conversation_id", conversationId);
  url.searchParams.set("limit", limit.toString());
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch execution runs");
  return res.json();
}

export async function fetchRunDetails(runId: string): Promise<ExecutionRun> {
  const res = await fetch(`${API_BASE_URL}/api/v1/runs/${runId}`);
  if (!res.ok) throw new Error("Failed to fetch run details");
  return res.json();
}

export async function resumeExecutionRun(runId: string): Promise<ExecutionRun> {
  const res = await fetch(`${API_BASE_URL}/api/v1/runs/${runId}/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to resume execution run");
  return res.json();
}

export async function cancelExecutionRun(
  runId: string,
  reason: string = "User cancelled execution"
): Promise<ExecutionRun> {
  const res = await fetch(`${API_BASE_URL}/api/v1/runs/${runId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error("Failed to cancel execution run");
  return res.json();
}

export async function fetchUserPreferences(): Promise<Record<string, any>> {
  const res = await fetch(`${API_BASE_URL}/api/v1/memory/preferences`);
  if (!res.ok) throw new Error("Failed to fetch user preferences");
  return res.json();
}

export async function updateUserPreference(
  key: string,
  value: any,
  summary?: string
): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/v1/memory/preferences`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value, summary }),
  });
  if (!res.ok) throw new Error("Failed to update user preference");
  return res.json();
}

export async function fetchTaskHistory(repo?: string): Promise<any[]> {
  const url = new URL(`${API_BASE_URL}/api/v1/memory/tasks`);
  if (repo) url.searchParams.set("repo", repo);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch task history");
  return res.json();
}
