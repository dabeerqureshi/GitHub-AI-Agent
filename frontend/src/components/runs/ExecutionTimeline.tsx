"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  cancelExecutionRun,
  ExecutionRun,
  fetchExecutionRuns,
  resumeExecutionRun,
} from "@/lib/api";

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
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "RUNNING":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse";
      case "WAITING_APPROVAL":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "FAILED":
        return "bg-rose-500/20 text-rose-400 border-rose-500/30";
      case "INTERRUPTED":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "CANCELLED":
        return "bg-slate-700 text-slate-400 border-slate-600";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="flex h-full bg-[#0d1117] text-slate-100 overflow-hidden">
      {/* Runs Sidebar List */}
      <div className="w-80 border-r border-slate-800 flex flex-col h-full bg-slate-900/60">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <span>⚡</span> Execution Runs
          </h2>
          <button
            onClick={loadRuns}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            ↻ Refresh
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
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
                className={`p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-slate-800/90 border-blue-500/50 shadow-sm"
                    : "bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getStatusBadge(
                      r.status
                    )}`}
                  >
                    {r.status}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(r.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="font-medium text-slate-200 line-clamp-2">
                  {r.user_request}
                </div>
                {r.repo_name && (
                  <div className="mt-1 text-[11px] text-slate-400 font-mono truncate">
                    {r.repo_name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Timeline & Diagnostic Detail */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 bg-[#0d1117]">
        {error && (
          <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {selectedRun ? (
          <div className="space-y-6 max-w-4xl">
            {/* Header / Summary Card */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/80">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded border uppercase ${getStatusBadge(
                        selectedRun.status
                      )}`}
                    >
                      {selectedRun.status}
                    </span>
                    {selectedRun.repo_name && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {selectedRun.repo_name}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 font-mono">
                      Run ID: {selectedRun.id.slice(0, 8)}...
                    </span>
                  </div>
                  <h1 className="text-base font-semibold text-slate-100">
                    {selectedRun.user_request}
                  </h1>
                </div>

                {/* Controls: Resume / Cancel */}
                <div className="flex items-center gap-2">
                  {(selectedRun.status === "INTERRUPTED" ||
                    selectedRun.status === "WAITING_APPROVAL") && (
                    <button
                      disabled={actionInProgress === selectedRun.id}
                      onClick={() => handleResume(selectedRun.id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
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
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-700 text-slate-300 transition-colors disabled:opacity-50"
                    >
                      ✕ Cancel Run
                    </button>
                  )}
                </div>
              </div>

              {/* Error diagnostic banner if failed or interrupted */}
              {selectedRun.error_message && (
                <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                  <div className="font-bold mb-1">Diagnostic Detail:</div>
                  {selectedRun.error_message}
                </div>
              )}
            </div>

            {/* Execution Step Timeline */}
            <div>
              <h2 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                <span>⏱️</span> Execution Step History & Tool Activity
              </h2>

              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800">
                {selectedRun.step_history?.map((step, idx) => (
                  <div key={idx} className="relative flex items-start gap-4 pl-8">
                    <div className="absolute left-2 top-2 w-3.5 h-3.5 rounded-full border-2 border-slate-900 bg-blue-500" />
                    <div className="flex-1 p-3.5 rounded-lg border border-slate-800 bg-slate-900/60">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">
                          {step.step || "Workflow Action"}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : ""}
                        </span>
                      </div>
                      {step.status && (
                        <div className="text-[11px] font-medium text-slate-400 mt-1">
                          Status: <span className="text-slate-300">{step.status}</span>
                        </div>
                      )}
                      {step.message && (
                        <div className="text-xs text-slate-400 mt-1">{step.message}</div>
                      )}
                      {step.details && Object.keys(step.details).length > 0 && (
                        <pre className="mt-2 p-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono overflow-x-auto">
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
          <div className="flex items-center justify-center h-full text-sm text-slate-500">
            Select an execution run to view its timeline and tool activity.
          </div>
        )}
      </div>
    </div>
  );
}
