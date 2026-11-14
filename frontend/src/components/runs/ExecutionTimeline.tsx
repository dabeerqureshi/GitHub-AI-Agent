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
    <div className="flex flex-col md:flex-row h-full bg-background text-foreground overflow-hidden">
      {/* Runs Sidebar List */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-border flex flex-col h-72 md:h-full bg-card/60 backdrop-blur-md">
        <div className="p-3.5 border-b border-border flex items-center justify-between">
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span>Execution Runs</span>
          </h2>
          <button
            onClick={loadRuns}
            disabled={loading}
            className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin text-primary" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
          {loading && runs.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground font-mono">Loading runs...</div>
          )}

          {!loading && runs.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground font-mono">No execution runs yet.</div>
          )}

          {runs.map((r) => {
            const isSelected = selectedRun?.id === r.id;
            return (
              <div
                key={r.id}
                onClick={() => setSelectedRun(r)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  isSelected
                    ? "bg-secondary text-foreground font-semibold border-primary/40 shadow-xs"
                    : "bg-card/70 border-border text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase ${getStatusBadge(
                      r.status
                    )}`}
                  >
                    {r.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono font-tabular">
                    {new Date(r.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="font-medium text-foreground line-clamp-2">
                  {r.user_request}
                </div>
                {r.repo_name && (
                  <div className="mt-1.5 text-[11px] text-muted-foreground font-mono truncate flex items-center gap-1">
                    <FolderGit2 className="h-3 w-3 text-primary shrink-0" />
                    <span>{r.repo_name}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Timeline & Diagnostic Detail */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 sm:p-6 md:p-8 bg-background">
        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
            {error}
          </div>
        )}

        {selectedRun ? (
          <div className="space-y-6 max-w-4xl">
            {/* Header / Summary Card */}
            <div className="p-5 rounded-2xl surface-card interactive-card">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase ${getStatusBadge(
                        selectedRun.status
                      )}`}
                    >
                      {selectedRun.status}
                    </span>
                    {selectedRun.repo_name && (
                      <span className="text-xs font-mono px-2.5 py-0.5 rounded-lg bg-secondary text-foreground border border-border flex items-center gap-1">
                        <FolderGit2 className="h-3 w-3 text-primary" />
                        {selectedRun.repo_name}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground font-mono font-tabular">
                      Run ID: {selectedRun.id.slice(0, 8)}...
                    </span>
                  </div>
                  <h1 className="text-base font-semibold text-foreground">
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
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-white shadow-sm shadow-primary/25 transition-all cursor-pointer disabled:opacity-50"
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
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-secondary hover:bg-rose-500/20 hover:text-rose-400 border border-border text-muted-foreground transition-all cursor-pointer disabled:opacity-50"
                    >
                      ✕ Cancel Run
                    </button>
                  )}
                </div>
              </div>

              {/* Error diagnostic banner if failed or interrupted */}
              {selectedRun.error_message && (
                <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
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
              <h2 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>Execution Step History & Tool Activity</span>
              </h2>

              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-border">
                {selectedRun.step_history?.map((step, idx) => (
                  <div key={idx} className="relative flex items-start gap-4 pl-8">
                    <div className="absolute left-2 top-2.5 w-3.5 h-3.5 rounded-full border-2 border-background bg-primary shadow-xs" />
                    <div className="flex-1 p-4 rounded-xl surface-card interactive-card">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground font-mono">
                          {step.step || "Workflow Action"}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground font-tabular">
                          {step.timestamp ? new Date(step.timestamp).toLocaleTimeString() : ""}
                        </span>
                      </div>
                      {step.status && (
                        <div className="text-[11px] font-medium text-muted-foreground mt-1 font-mono">
                          Status: <span className="text-foreground">{step.status}</span>
                        </div>
                      )}
                      {step.message && (
                        <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.message}</div>
                      )}
                      {step.details && Object.keys(step.details).length > 0 && (
                        <pre className="mt-2.5 p-3 rounded-lg bg-background/90 border border-border text-[11px] text-foreground font-mono overflow-x-auto">
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
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground font-mono">
            Select an execution run to view its timeline and tool activity.
          </div>
        )}
      </div>
    </div>
  );
}
