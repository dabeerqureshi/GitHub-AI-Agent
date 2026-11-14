"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderGit2,
  GitPullRequest,
  CircleDot,
  Bot,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Terminal,
  Activity as ActivityIcon,
  Search,
  ExternalLink,
  ChevronRight,
  Send,
  Layers,
  Bug,
  FileSearch,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useChatStore } from "@/store/use-chat-store";
import {
  fetchExecutionRuns,
  fetchAuditEvents,
  ExecutionRun,
  AuditEvent,
} from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const {
    activeRepo,
    repositories,
    pendingApprovals,
    sendUserMessage,
    startNewConversation,
    loadRepositories,
  } = useChatStore();

  const [promptInput, setPromptInput] = useState("");
  const [runs, setRuns] = useState<ExecutionRun[]>([]);
  const [activity, setActivity] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [runsData, eventsData] = await Promise.all([
        fetchExecutionRuns().catch(() => []),
        fetchAuditEvents().catch(() => []),
      ]);
      setRuns(runsData);
      setActivity(eventsData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleLaunchPrompt = (text: string) => {
    if (!text.trim()) return;
    startNewConversation(
      activeRepo ? `Session: ${activeRepo.split("/").pop()}` : "New Workspace Session"
    );
    sendUserMessage(text.trim());
    router.push("/chat");
  };

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLaunchPrompt(promptInput);
  };

  // Metrics calculation
  const connectedReposCount = repositories.length;
  const activeAgentTasks = runs.filter(
    (r) => r.status === "RUNNING" || r.status === "WAITING_APPROVAL"
  ).length;
  const pendingApprovalsCount = pendingApprovals.length;

  const targetRepo = activeRepo || (repositories[0]?.full_name ?? "your repository");

  const suggestedPrompts = [
    {
      title: "Analyze Repository Architecture",
      desc: "Parse structure, module dependencies & patterns",
      prompt: `Analyze the architecture and code structure of ${targetRepo}`,
      icon: Layers,
    },
    {
      title: "Find Critical Open Issues",
      desc: "Categorize defects, error logs & backlog",
      prompt: `Find critical open issues and bugs in ${targetRepo}`,
      icon: Bug,
    },
    {
      title: "Review Pending Pull Requests",
      desc: "Conduct automated diff analysis and security check",
      prompt: `Review pending pull requests and code changes in ${targetRepo}`,
      icon: GitPullRequest,
    },
    {
      title: "Investigate Failing CI Workflows",
      desc: "Isolate failing workflow steps and synthesize fixes",
      prompt: `Analyze failing CI workflow runs in ${targetRepo}`,
      icon: FileSearch,
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#252D3A] gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F5F9]">
              Overview
            </h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Your development workspace and autonomous agents at a glance.
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              onClick={() => {
                loadRepositories();
                loadDashboardData();
              }}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#121722] hover:bg-[#171E2B] border border-[#252D3A] text-xs font-medium text-[#F1F5F9] transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#818CF8] ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* SECTION 1 — KEY METRICS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Link
            href="/repositories"
            className="p-4 rounded-xl surface-card interactive-card flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-[#64748B]">
              <span className="text-xs font-mono font-medium uppercase tracking-wider">
                Repositories
              </span>
              <FolderGit2 className="h-4 w-4 text-[#818CF8]" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#F1F5F9] font-tabular">
                {connectedReposCount}
              </div>
              <div className="text-[11px] text-[#94A3B8] mt-0.5">Connected accounts</div>
            </div>
          </Link>

          <Link
            href="/pull-requests"
            className="p-4 rounded-xl surface-card interactive-card flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-[#64748B]">
              <span className="text-xs font-mono font-medium uppercase tracking-wider">
                Pull Requests
              </span>
              <GitPullRequest className="h-4 w-4 text-[#38BDF8]" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#F1F5F9] font-tabular">
                {runs.filter((r) => r.user_request?.toLowerCase().includes("pr") || r.user_request?.toLowerCase().includes("pull")).length}
              </div>
              <div className="text-[11px] text-[#94A3B8] mt-0.5">Active reviews & diffs</div>
            </div>
          </Link>

          <Link
            href="/issues"
            className="p-4 rounded-xl surface-card interactive-card flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-[#64748B]">
              <span className="text-xs font-mono font-medium uppercase tracking-wider">
                Open Issues
              </span>
              <CircleDot className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#F1F5F9] font-tabular">
                {runs.filter((r) => r.user_request?.toLowerCase().includes("issue") || r.user_request?.toLowerCase().includes("bug")).length}
              </div>
              <div className="text-[11px] text-[#94A3B8] mt-0.5">Tracked & triaged</div>
            </div>
          </Link>

          <Link
            href="/approvals"
            className="p-4 rounded-xl surface-card interactive-card flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-[#64748B]">
              <span className="text-xs font-mono font-medium uppercase tracking-wider">
                Agent Tasks
              </span>
              <Bot className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#F1F5F9] font-tabular">
                {activeAgentTasks || pendingApprovalsCount}
              </div>
              <div className="text-[11px] text-[#94A3B8] mt-0.5">
                {pendingApprovalsCount > 0 ? `${pendingApprovalsCount} awaiting approval` : "All systems normal"}
              </div>
            </div>
          </Link>
        </div>

        {/* SECTION 2 — AI WORKSPACE (Command Panel) */}
        <div className="p-5 sm:p-6 rounded-xl surface-card border border-[#252D3A] space-y-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-[#818CF8]" />
            <h2 className="text-sm font-semibold text-[#F1F5F9]">
              What would you like to work on?
            </h2>
          </div>

          <form onSubmit={handlePromptSubmit} className="space-y-3">
            <div className="relative rounded-lg border border-[#252D3A] bg-[#0D1017] focus-within:border-[#818CF8]/60 transition-colors">
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder={`Instruct GitHub AI on ${targetRepo} (e.g. 'Investigate open bugs', 'Explain commit history')...`}
                rows={2}
                className="w-full resize-none bg-transparent p-3 text-xs md:text-sm text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none"
              />
              <div className="flex items-center justify-between p-2 pt-0 border-t border-[#252D3A]/40 text-xs text-[#64748B]">
                <span className="text-[11px] font-mono">
                  Target: <span className="text-[#F1F5F9] font-medium">{targetRepo}</span>
                </span>
                <button
                  type="submit"
                  disabled={!promptInput.trim()}
                  className="px-3.5 py-1.5 bg-[#818CF8] hover:bg-[#818CF8]/90 text-[#090B10] font-semibold rounded-md text-xs flex items-center space-x-1.5 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  <Send className="h-3 w-3" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </form>

          {/* Quick Action Prompt Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
            {suggestedPrompts.map((card, idx) => {
              const Icon = card.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleLaunchPrompt(card.prompt)}
                  className="flex items-start space-x-3 p-3 rounded-lg bg-[#0D1017] hover:bg-[#171E2B] border border-[#252D3A] text-left transition-all cursor-pointer group"
                >
                  <div className="p-1.5 rounded-md bg-[#121722] text-[#818CF8] border border-[#252D3A] group-hover:border-indigo-500/40 shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#F1F5F9] group-hover:text-[#818CF8] transition-colors truncate">
                      {card.title}
                    </div>
                    <div className="text-[10px] text-[#94A3B8] mt-0.5 line-clamp-1">
                      {card.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* TWO COLUMN GRID: RECENT ACTIVITY & AGENT STATUS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SECTION 3 — RECENT ACTIVITY */}
          <div className="rounded-xl surface-card p-5 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#252D3A]">
              <div className="flex items-center space-x-2">
                <ActivityIcon className="h-4 w-4 text-[#818CF8]" />
                <h3 className="text-sm font-semibold text-[#F1F5F9]">Recent Activity</h3>
              </div>
              <Link
                href="/activity"
                className="text-[11px] font-mono text-[#818CF8] hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-2">
              {activity.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#64748B] font-mono">
                  No activity recorded yet. Run agent tasks in the workspace to see live events.
                </div>
              ) : (
                activity.slice(0, 5).map((act) => (
                  <div
                    key={act.id}
                    className="p-2.5 rounded-lg bg-[#0D1017] border border-[#252D3A] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#818CF8] shrink-0" />
                      <div className="truncate">
                        <span className="font-mono text-[#F1F5F9] font-medium mr-1.5">
                          {act.event_type}
                        </span>
                        {act.tool_name && (
                          <span className="text-[11px] font-mono text-[#94A3B8]">
                            ({act.tool_name})
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-[#64748B] font-mono shrink-0 ml-2 font-tabular">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SECTION 4 — AGENT STATUS */}
          <div className="rounded-xl surface-card p-5 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-[#252D3A]">
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-[#F1F5F9]">Agent Status</h3>
              </div>
              <Link
                href="/agents"
                className="text-[11px] font-mono text-[#818CF8] hover:underline flex items-center gap-1"
              >
                <span>View runs</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-2">
              {runs.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#64748B] font-mono">
                  No agent runs logged yet. Execute workflows via chat.
                </div>
              ) : (
                runs.slice(0, 5).map((run) => (
                  <div
                    key={run.id}
                    className="p-2.5 rounded-lg bg-[#0D1017] border border-[#252D3A] flex items-center justify-between text-xs"
                  >
                    <div className="truncate pr-2">
                      <div className="font-medium text-[#F1F5F9] truncate">
                        {run.user_request}
                      </div>
                      <div className="text-[10px] text-[#64748B] font-mono truncate mt-0.5">
                        {run.repo_name || "global"}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full shrink-0 border ${
                        run.status === "COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : run.status === "RUNNING"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse"
                          : run.status === "WAITING_APPROVAL"
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      }`}
                    >
                      {run.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* SECTION 5 & 6 — PULL REQUESTS & WORKFLOW HEALTH */}
        <div className="rounded-xl surface-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#252D3A]">
            <div className="flex items-center space-x-2">
              <Terminal className="h-4 w-4 text-[#818CF8]" />
              <h3 className="text-sm font-semibold text-[#F1F5F9]">Workflow Health & Execution Runs</h3>
            </div>
            <Link
              href="/coding-tasks"
              className="text-[11px] font-mono text-[#818CF8] hover:underline flex items-center gap-1"
            >
              <span>Coding tasks</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0D1017] text-[#64748B] font-mono border-b border-[#252D3A]">
                <tr>
                  <th className="p-3">Run ID</th>
                  <th className="p-3">Instruction / Target</th>
                  <th className="p-3">Repository</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252D3A]">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-[#64748B] font-mono">
                      No workflow runs recorded yet.
                    </td>
                  </tr>
                ) : (
                  runs.slice(0, 4).map((r) => (
                    <tr key={r.id} className="hover:bg-[#171E2B]/50 transition-colors">
                      <td className="p-3 font-mono text-[#818CF8]">{r.id.slice(0, 8)}</td>
                      <td className="p-3 font-medium text-[#F1F5F9] max-w-sm truncate">
                        {r.user_request}
                      </td>
                      <td className="p-3 font-mono text-[#94A3B8]">{r.repo_name || "—"}</td>
                      <td className="p-3">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#0D1017] border border-[#252D3A] text-[#F1F5F9]">
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[#64748B] font-tabular">
                        {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
