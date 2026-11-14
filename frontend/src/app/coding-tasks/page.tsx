"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Terminal,
  FolderGit2,
  GitBranch,
  CheckCircle2,
  Clock,
  Sparkles,
  Play,
  RotateCw,
  FileCode,
  ShieldAlert,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useChatStore } from "@/store/use-chat-store";
import { fetchExecutionRuns, ExecutionRun } from "@/lib/api";

export default function CodingTasksPage() {
  const { activeRepo, sendUserMessage, startNewConversation } = useChatStore();
  const [runs, setRuns] = useState<ExecutionRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExecutionRuns()
      .then(setRuns)
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#252D3A] gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
              <Terminal className="h-6 w-6 text-[#818CF8]" />
              <span>Coding Tasks</span>
            </h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Autonomous code modifications, test execution, and pull request generation.
            </p>
          </div>

          <Link
            href="/chat"
            onClick={() => {
              startNewConversation(`Coding Task: ${activeRepo || "Workspace"}`);
              sendUserMessage(`Implement unit tests and fix defects in ${activeRepo || "the repository"}`);
            }}
            className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#818CF8] hover:bg-[#818CF8]/90 text-[#090B10] text-xs font-semibold transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>New Coding Task</span>
          </Link>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {runs.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#252D3A] rounded-xl surface-card">
              <div className="w-12 h-12 rounded-xl bg-[#0D1017] text-[#64748B] flex items-center justify-center mx-auto mb-3 border border-[#252D3A]">
                <FileCode className="h-6 w-6 text-[#818CF8]" />
              </div>
              <div className="text-sm font-semibold text-[#F1F5F9]">No coding tasks recorded</div>
              <p className="text-xs text-[#94A3B8] mt-1 max-w-sm mx-auto">
                Ask the agent in the chat to write code, fix bugs, or create tests to see automated coding tasks here.
              </p>
            </div>
          ) : (
            runs.map((run) => (
              <div
                key={run.id}
                className="p-4 rounded-xl surface-card border border-[#252D3A] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 truncate">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs text-[#818CF8] font-semibold">
                      {run.id.slice(0, 8)}
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                        run.status === "COMPLETED"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : run.status === "RUNNING"
                          ? "bg-blue-500/15 text-blue-400 border-blue-500/30 animate-pulse"
                          : run.status === "WAITING_APPROVAL"
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                      }`}
                    >
                      {run.status}
                    </span>
                    {run.repo_name && (
                      <span className="text-xs font-mono text-[#94A3B8] flex items-center gap-1">
                        <FolderGit2 className="h-3 w-3 text-[#64748B]" />
                        <span>{run.repo_name}</span>
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-[#F1F5F9] truncate">
                    {run.user_request}
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0 text-xs font-mono text-[#64748B]">
                  <span>{new Date(run.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <Link
                    href="/agents"
                    className="px-2.5 py-1 text-xs font-medium rounded-md bg-[#121722] hover:bg-[#171E2B] text-[#818CF8] border border-[#252D3A] transition-colors"
                  >
                    View Timeline &rarr;
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
