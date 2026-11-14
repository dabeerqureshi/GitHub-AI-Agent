"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  cancelExecutionRun,
  ExecutionRun,
  fetchExecutionRuns,
  resumeExecutionRun,
} from "@/lib/api";
import {
  Activity,
  Play,
  XCircle,
  RefreshCw,
  FolderGit2,
  Clock,
  Terminal,
  AlertOctagon,
  CheckCircle2,
  GitFork,
  ArrowRight,
  Sparkles,
  Layers,
  Bug,
  FileSearch,
} from "lucide-react";
import { useChatStore } from "@/store/use-chat-store";

export function ExecutionTimeline() {
  const { activeRepo, sendUserMessage, startNewConversation } = useChatStore();
  const [runs, setRuns] = useState<ExecutionRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<ExecutionRun | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchExecutionRuns();
      setRuns(data);
      if (data.length > 0 && !selectedRun) {
        setSelectedRun(data[0]);
      } else if (selectedRun) {
        const updated = data.find((r) => r.id === selectedRun.id);
        if (updated) setSelectedRun(updated);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load execution runs");
    } finally {
      setLoading(false);
    }
  }, [selectedRun]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const handleResume = async (runId: string) => {
    try {
      setActionInProgress(runId);
      const updated = await resumeExecutionRun(runId);
      setSelectedRun(updated);
      await loadRuns();
    } catch (err: any) {
      alert(`Resume failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCancel = async (runId: string) => {
    try {
      setActionInProgress(runId);
      const updated = await cancelExecutionRun(runId, "Cancelled by user from execution center");
      setSelectedRun(updated);
      await loadRuns();
    } catch (err: any) {
      alert(`Cancel failed: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "RUNNING":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30 animate-pulse";
      case "WAITING_APPROVAL":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "FAILED":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      case "INTERRUPTED":
        return "bg-purple-500/15 text-purple-300 border-purple-500/30";
      case "CANCELLED":
        return "bg-slate-800 text-slate-400 border-slate-700";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-5.75rem)] bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Runs Sidebar List */}
      <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col h-72 lg:h-full bg-slate-900/90 shrink-0">
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-400" />
            <span>Execution Runs</span>
          </h2>
          <button
            onClick={loadRuns}
            disabled={loading}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {loading && runs.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-500">Loading runs...</div>
          )}

          {!loading && runs.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-500">No execution runs yet.</div>
          )}

          {runs.map((r) => {
            const isSelected = selectedRun?.id === r.id;
            return (
              <div
                key={r.id}
                onClick={() => setSelectedRun(r)}
                className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                  isSelected
                    ? "bg-indigo-600/15 border-indigo-500/50 text-white shadow-xs"
                    : "bg-slate-950 border-slate-800/80 text-slate-400 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase ${getStatusBadge(
                      r.status
                    )}`}
                  >
                    {r.status}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono font-tabular">
                    {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="font-medium text-white line-clamp-2 text-xs leading-relaxed">
                  {r.user_request}
                </div>
                {r.repo_name && (
                  <div className="mt-1.5 text-[11px] text-slate-400 font-mono truncate flex items-center gap-1.5">
                    <FolderGit2 className="h-3 w-3 text-indigo-400 shrink-0" />
                    <span className="truncate">{r.repo_name}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Timeline & Diagnostic Detail */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}

        {selectedRun ? (
          <div className="space-y-5 max-w-4xl mx-auto w-full">
            {/* Header / Summary Card */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase ${getStatusBadge(
                        selectedRun.status
                      )}`}
                    >
                      {selectedRun.status}
                    </span>
                    {selectedRun.repo_name && (
                      <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-slate-950 text-slate-200 border border-slate-800 flex items-center gap-1.5">
                        <FolderGit2 className="h-3.5 w-3.5 text-indigo-400" />
                        {selectedRun.repo_name}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 font-mono">
                      Run ID: {selectedRun.id.slice(0, 8)}...
                    </span>
                  </div>
                  <h1 className="text-base sm:text-lg font-semibold text-white leading-snug">
                    {selectedRun.user_request}
                  </h1>
                </div>

                {/* Controls: Resume / Cancel */}
                <div className="flex items-center gap-2 shrink-0">
                  {(selectedRun.status === "INTERRUPTED" ||
                    selectedRun.status === "WAITING_APPROVAL") && (
                    <button
                      disabled={actionInProgress === selectedRun.id}
                      onClick={() => handleResume(selectedRun.id)}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all cursor-pointer disabled:opacity-40"
                    >
                      ▶ Resume Run
                    </button>
                  )}
                  {(selectedRun.status === "RUNNING" ||
                    selectedRun.status === "WAITING_APPROVAL" ||
                    selectedRun.status === "INTERRUPTED") && (
                    <button
                      disabled={actionInProgress === selectedRun.id}
                      onClick={() => handleCancel(selectedRun.id)}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-700 text-slate-300 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      ✕ Cancel Run
                    </button>
                  )}
                </div>
              </div>

              {/* Error diagnostic banner if failed or interrupted */}
              {selectedRun.error_message && (
                <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono leading-relaxed">
                  <div className="font-bold mb-1 flex items-center gap-2">
                    <AlertOctagon className="h-4 w-4 text-rose-400" />
                    <span>Diagnostic Detail:</span>
                  </div>
                  {selectedRun.error_message}
                </div>
              )}
            </div>

            {/* Execution Step Timeline */}
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                <Clock className="h-4 w-4 text-indigo-400" />
                <span>Execution Step History &amp; Tool Activity</span>
              </h2>

              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-[1px] before:bg-slate-800">
                {selectedRun.step_history?.map((step, idx) => (
                  <div key={idx} className="relative flex items-start gap-3.5 pl-7">
                    <div className="absolute left-1.5 top-3 w-3 h-3 rounded-full border-2 border-slate-950 bg-indigo-500 shadow-xs" />
                    <div className="flex-1 p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">
                          {step.step || "Workflow Action"}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 font-tabular">
                          {step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : ""}
                        </span>
                      </div>
                      {step.status && (
                        <div className="text-xs text-slate-400">
                          Status: <span className="text-white font-medium">{step.status}</span>
                        </div>
                      )}
                      {step.message && (
                        <div className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-0.5">{step.message}</div>
                      )}
                      {step.details && Object.keys(step.details).length > 0 && (
                        <pre className="mt-2.5 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono overflow-x-auto leading-relaxed">
                          {JSON.stringify(step.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Enterprise Empty State: No Run Selected OR No Runs Exist */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto my-auto space-y-5 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/25 shadow-lg">
              <GitFork className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Autonomous Execution Hub</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                No Execution Runs Yet
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
                Execution runs track autonomous multi-step agent tasks, file modifications, pull requests,
                and CI investigations triggered from the workspace.
              </p>
            </div>

            {/* Launch CTA Button */}
            <Link
              href="/"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-md hover:shadow-indigo-500/25 transition-all cursor-pointer"
            >
              <Play className="h-4 w-4" />
              <span>Launch First Agent Task in Workspace</span>
            </Link>

            {/* Hint text preserving test compatibility */}
            <p className="text-[11px] text-slate-500 font-mono">
              Select an execution run to view its timeline and tool activity.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
