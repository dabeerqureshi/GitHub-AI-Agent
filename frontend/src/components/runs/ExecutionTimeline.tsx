"use client";

import React, { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";

export function ExecutionTimeline() {
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
        return "bg-secondary text-muted-foreground border-border";
      default:
        return "bg-secondary text-muted-foreground border-border";
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-[#1e1e1e] text-[#cccccc] overflow-hidden font-mono">
      {/* Runs Sidebar List */}
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[#2b2b2b] flex flex-col h-72 md:h-full bg-[#252526]">
        <div className="p-2.5 border-b border-[#2b2b2b] flex items-center justify-between bg-[#252526]">
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-white flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-[#007acc]" />
            <span>Execution Runs</span>
          </h2>
          <button
            onClick={loadRuns}
            disabled={loading}
            className="flex items-center space-x-1 text-xs text-[#858585] hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin text-[#007acc]" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {loading && runs.length === 0 && (
            <div className="text-center py-6 text-xs text-[#858585] font-mono">Loading runs...</div>
          )}

          {!loading && runs.length === 0 && (
            <div className="text-center py-6 text-xs text-[#858585] font-mono">No execution runs yet.</div>
          )}

          {runs.map((r) => {
            const isSelected = selectedRun?.id === r.id;
            return (
              <div
                key={r.id}
                onClick={() => setSelectedRun(r)}
                className={`p-2 rounded border text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-[#37373d] text-white font-medium border-l-2 border-l-[#007acc] border-y border-r border-[#2b2b2b]"
                    : "bg-[#1e1e1e] border-[#2b2b2b] text-[#858585] hover:bg-[#2a2d2e] hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border uppercase ${getStatusBadge(
                      r.status
                    )}`}
                  >
                    {r.status}
                  </span>
                  <span className="text-[10px] text-[#858585] font-mono font-tabular">
                    {new Date(r.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="font-medium text-white line-clamp-2 text-[11px]">
                  {r.user_request}
                </div>
                {r.repo_name && (
                  <div className="mt-1 text-[10px] text-[#858585] font-mono truncate flex items-center gap-1">
                    <FolderGit2 className="h-3 w-3 text-[#007acc] shrink-0" />
                    <span>{r.repo_name}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Timeline & Diagnostic Detail */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 sm:p-6 bg-[#1e1e1e]">
        {error && (
          <div className="p-2.5 mb-3 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
            {error}
          </div>
        )}

        {selectedRun ? (
          <div className="space-y-4 max-w-4xl font-mono">
            {/* Header / Summary Card */}
            <div className="p-3.5 rounded bg-[#252526] border border-[#2b2b2b]">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.2 rounded border uppercase ${getStatusBadge(
                        selectedRun.status
                      )}`}
                    >
                      {selectedRun.status}
                    </span>
                    {selectedRun.repo_name && (
                      <span className="text-[11px] font-mono px-2 py-0.2 rounded bg-[#1e1e1e] text-white border border-[#2b2b2b] flex items-center gap-1">
                        <FolderGit2 className="h-3 w-3 text-[#007acc]" />
                        {selectedRun.repo_name}
                      </span>
                    )}
                    <span className="text-[11px] text-[#858585] font-mono font-tabular">
                      Run ID: {selectedRun.id.slice(0, 8)}...
                    </span>
                  </div>
                  <h1 className="text-sm font-semibold text-white">
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
                      className="px-3 py-1 text-xs font-medium rounded bg-[#007acc] hover:bg-[#0e639c] text-white shadow-xs transition-colors cursor-pointer disabled:opacity-40"
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
                      className="px-3 py-1 text-xs font-medium rounded bg-[#1e1e1e] hover:bg-rose-500/20 hover:text-rose-400 border border-[#2b2b2b] text-[#858585] transition-colors cursor-pointer disabled:opacity-40"
                    >
                      ✕ Cancel Run
                    </button>
                  )}
                </div>
              </div>

              {/* Error diagnostic banner if failed or interrupted */}
              {selectedRun.error_message && (
                <div className="mt-3 p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                  <div className="font-bold mb-1 flex items-center gap-1.5">
                    <AlertOctagon className="h-4 w-4 text-rose-400" />
                    <span>Diagnostic Detail:</span>
                  </div>
                  {selectedRun.error_message}
                </div>
              )}
            </div>

            {/* Execution Step Timeline */}
            <div>
              <h2 className="text-xs font-bold text-white mb-2.5 flex items-center gap-2 uppercase tracking-wider">
                <Clock className="h-3.5 w-3.5 text-[#007acc]" />
                <span>Execution Step History & Tool Activity</span>
              </h2>

              <div className="space-y-2.5 relative before:absolute before:inset-0 before:left-2.5 before:w-[1px] before:bg-[#2b2b2b]">
                {selectedRun.step_history?.map((step, idx) => (
                  <div key={idx} className="relative flex items-start gap-3 pl-6">
                    <div className="absolute left-1 top-2.5 w-2.5 h-2.5 rounded-full border border-[#1e1e1e] bg-[#007acc]" />
                    <div className="flex-1 p-3 rounded bg-[#252526] border border-[#2b2b2b]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white font-mono">
                          {step.step || "Workflow Action"}
                        </span>
                        <span className="text-[10px] font-mono text-[#858585] font-tabular">
                          {step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : ""}
                        </span>
                      </div>
                      {step.status && (
                        <div className="text-[10px] font-medium text-[#858585] mt-0.5 font-mono">
                          Status: <span className="text-white">{step.status}</span>
                        </div>
                      )}
                      {step.message && (
                        <div className="text-xs text-[#858585] mt-1 leading-relaxed">{step.message}</div>
                      )}
                      {step.details && Object.keys(step.details).length > 0 && (
                        <pre className="mt-2 p-2 rounded bg-[#1e1e1e] border border-[#2b2b2b] text-[10px] text-[#cccccc] font-mono overflow-x-auto">
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
          <div className="flex items-center justify-center h-full text-xs text-[#858585] font-mono">
            Select an execution run to view its timeline and tool activity.
          </div>
        )}
      </div>
    </div>
  );
}
