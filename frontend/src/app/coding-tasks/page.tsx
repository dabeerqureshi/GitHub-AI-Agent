"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Terminal,
  FolderGit2,
  Sparkles,
  Play,
  FileCode,
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
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Terminal className="h-6 w-6 text-indigo-400" />
              <span>Coding Tasks</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Autonomous code modifications, test execution, and pull request generation.
            </p>
          </div>

          <Link
            href="/chat"
            onClick={() => {
              startNewConversation(`Coding Task: ${activeRepo || "Workspace"}`);
              sendUserMessage(`Implement unit tests and fix defects in ${activeRepo || "the repository"}`);
            }}
            className="self-start sm:self-auto inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>New Coding Task</span>
          </Link>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {runs.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-900/60 max-w-lg mx-auto space-y-3 my-8">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/25">
                <FileCode className="h-6 w-6" />
              </div>
              <div className="text-base font-semibold text-white">No coding tasks recorded</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Ask the agent in the chat to write code, fix bugs, or create tests to see automated coding tasks here.
              </p>
            </div>
          ) : (
            runs.map((run) => (
              <div
                key={run.id}
                className="p-4 sm:p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 truncate">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs text-indigo-400 font-semibold">
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
                      <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                        <FolderGit2 className="h-3 w-3 text-indigo-400" />
                        <span>{run.repo_name}</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-white truncate max-w-xl">
                    {run.user_request}
                  </div>
                </div>

                <Link
                  href="/runs"
                  className="self-start sm:self-auto inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                >
                  <Play className="h-3 w-3" />
                  <span>Inspect Timeline</span>
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
