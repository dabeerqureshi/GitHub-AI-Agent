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
  RefreshCw,
  Activity as ActivityIcon,
  ChevronRight,
  Send,
  Layers,
  Bug,
  FileSearch,
  Terminal,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useChatStore } from "@/store/use-chat-store";
import { ModelDropdown } from "@/components/models/ModelDropdown";
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
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6 font-sans">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Dashboard Overview
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Your developer workspace, active LLM engines, and autonomous tasks at a glance.
            </p>
          </div>

          <div className="flex items-center space-x-3 self-start sm:self-auto">
            {/* Model Selector Dropdown right in the Dashboard header */}
            <ModelDropdown />

            <button
              onClick={() => {
                loadRepositories();
                loadDashboardData();
              }}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-indigo-400 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* SECTION 1 — KEY METRICS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Link
            href="/repositories"
            className="p-5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between shadow-xs"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Repositories
              </span>
              <FolderGit2 className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-bold text-white font-tabular">
                {connectedReposCount}
              </div>
              <div className="text-xs text-slate-400 mt-1">Connected accounts</div>
            </div>
          </Link>

          <Link
            href="/pull-requests"
            className="p-5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between shadow-xs"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Pull Requests
              </span>
              <GitPullRequest className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-bold text-white font-tabular">
                {runs.filter((r) => r.user_request?.toLowerCase().includes("pr") || r.user_request?.toLowerCase().includes("pull")).length}
              </div>
              <div className="text-xs text-slate-400 mt-1">Active reviews &amp; diffs</div>
            </div>
          </Link>

          <Link
            href="/issues"
            className="p-5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between shadow-xs"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Open Issues
              </span>
              <CircleDot className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-bold text-white font-tabular">
                {runs.filter((r) => r.user_request?.toLowerCase().includes("issue") || r.user_request?.toLowerCase().includes("bug")).length}
              </div>
              <div className="text-xs text-slate-400 mt-1">Tracked &amp; triaged</div>
            </div>
          </Link>

          <Link
            href="/approvals"
            className="p-5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between shadow-xs"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Agent Tasks
              </span>
              <Bot className="h-5 w-5 text-amber-400" />
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-bold text-white font-tabular">
                {activeAgentTasks || pendingApprovalsCount}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {pendingApprovalsCount > 0 ? `${pendingApprovalsCount} awaiting approval` : "All systems normal"}
              </div>
            </div>
          </Link>
        </div>

        {/* SECTION 2 — AI WORKSPACE (Command Panel) */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">
              What would you like to work on?
            </h2>
          </div>

          <form onSubmit={handlePromptSubmit} className="space-y-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder={`Instruct GitHub AI on ${targetRepo} (e.g. 'Investigate open bugs', 'Explain commit history')...`}
                rows={2}
                className="w-full resize-none bg-transparent p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
              <div className="flex items-center justify-between p-2.5 pt-0 border-t border-slate-800/60 text-xs text-slate-400">
                <span className="text-xs">
                  Target: <strong className="text-white font-mono">{targetRepo}</strong>
                </span>
                <button
                  type="submit"
                  disabled={!promptInput.trim()}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs flex items-center space-x-1.5 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
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
                  className="flex items-start space-x-3 p-3 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-left transition-all cursor-pointer group"
                >
                  <div className="p-1.5 rounded-md bg-slate-900 text-indigo-400 border border-slate-800 group-hover:border-indigo-500/40 shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">
                      {card.title}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      {card.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* TWO COLUMN GRID: RECENT ACTIVITY & AGENT STATUS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* SECTION 3 — RECENT ACTIVITY */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <ActivityIcon className="h-4 w-4 text-indigo-400" />
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Recent Activity</h3>
              </div>
              <Link
                href="/activity"
                className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="space-y-2">
              {activity.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No activity recorded yet. Run agent tasks in the workspace to see live events.
                </div>
              ) : (
                activity.slice(0, 5).map((act) => (
                  <div
                    key={act.id}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                      <div className="truncate">
                        <span className="text-white font-medium mr-1.5">
                          {act.event_type}
                        </span>
                        {act.tool_name && (
                          <span className="text-[11px] font-mono text-slate-400">
                            ({act.tool_name})
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono shrink-0 ml-2 font-tabular">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SECTION 4 — AGENT STATUS */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4 text-indigo-400" />
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Agent Status</h3>
              </div>
              <Link
                href="/agents"
                className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>View runs</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="space-y-2">
              {runs.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No agent runs logged yet. Execute workflows via chat.
                </div>
              ) : (
                runs.slice(0, 5).map((run) => (
                  <div
                    key={run.id}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="truncate pr-2">
                      <div className="font-medium text-white truncate">
                        {run.user_request}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                        {run.repo_name || "global"}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded shrink-0 border ${
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

        {/* SECTION 5 — WORKFLOW HEALTH & EXECUTION RUNS */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Terminal className="h-4 w-4 text-indigo-400" />
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Workflow Health &amp; Execution Runs
              </h3>
            </div>
            <Link
              href="/coding-tasks"
              className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Coding tasks</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3">Run ID</th>
                  <th className="p-3">Instruction / Target</th>
                  <th className="p-3">Repository</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No workflow runs recorded yet.
                    </td>
                  </tr>
                ) : (
                  runs.slice(0, 4).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono text-indigo-400">{r.id.slice(0, 8)}</td>
                      <td className="p-3 font-medium text-white max-w-sm truncate">
                        {r.user_request}
                      </td>
                      <td className="p-3 font-mono text-slate-400">{r.repo_name || "—"}</td>
                      <td className="p-3">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-200">
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-400 font-tabular">
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
