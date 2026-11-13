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
  step_id: string;
  tool_name: string;
  action_hash: string;
  description: string;
  payload: Record<string, any>;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  reviewer_notes?: string | null;
  created_at: string;
  resolved_at?: string | null;
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

export async function fetchRepositories(): Promise<RepositoryRecord[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/repos`);
  if (!res.ok) throw new Error("Failed to fetch repositories");
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
