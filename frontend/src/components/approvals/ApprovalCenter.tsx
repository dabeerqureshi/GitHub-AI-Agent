"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ApprovalRequest,
  decideApproval,
  fetchAllApprovals,
} from "@/lib/api";
import { DiffViewer } from "@/components/chat/DiffViewer";
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Clock,
  FolderGit2,
  Play,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

export function ApprovalCenter() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const loadApprovals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const statusFilter = selectedStatus === "ALL" ? undefined : selectedStatus;
      const data = await fetchAllApprovals(statusFilter);
      setApprovals(data);
    } catch (err: any) {
      setError(err.message || "Failed to load approvals");
    } finally {
      setLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const handleDecision = async (
    approval: ApprovalRequest,
    decision: "APPROVE" | "REJECT",
    notes?: string
  ) => {
    try {
      setActionInProgress(approval.id);
      await decideApproval(approval.id, {
        action_hash: approval.action_hash,
        decision,
        reviewer_notes:
          notes ||
          (decision === "APPROVE"
            ? "Approved in Approval Center"
            : "Rejected in Approval Center"),
      });
      await loadApprovals();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-5.75rem)] bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 overflow-y-auto font-sans">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Central Approval Center
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Cryptographic action verification, Human-In-The-Loop gating, TTL expiration, and replay protection.
              </p>
            </div>
          </div>

          <button
            onClick={loadApprovals}
            disabled={loading}
            className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 transition-colors cursor-pointer shadow-sm"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {["ALL", "PENDING", "APPROVED", "REJECTED", "EXPIRED"].map((status) => {
            const isActive = selectedStatus === status;
            return (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="space-y-3">
          {loading && approvals.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-xs font-mono">
              Loading approval records...
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
              {error}
            </div>
          )}

          {!loading && approvals.length === 0 && (
            <div className="text-center py-16 px-4 border border-slate-800/80 rounded-2xl bg-slate-900/60 max-w-lg mx-auto space-y-4 my-8">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/25">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">No approval records found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Mutating actions requiring cryptographic confirmation will appear here in real time.
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                <Play className="h-3.5 w-3.5" />
                <span>Return to Workspace</span>
              </Link>
            </div>
          )}

          {approvals.map((app) => {
            const isPending = app.status === "PENDING";
            const isExpired =
              app.status === "EXPIRED" ||
              (app.expires_at && new Date(app.expires_at).getTime() < Date.now());

            return (
              <div
                key={app.id}
                className="p-4 sm:p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                        {app.tool_name}
                      </span>
                      {app.repo_name && (
                        <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800 flex items-center gap-1.5">
                          <FolderGit2 className="h-3 w-3 text-indigo-400" />
                          {app.repo_name}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          isExpired
                            ? "bg-slate-800 text-slate-400 border-slate-700"
                            : app.status === "APPROVED"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : app.status === "REJECTED"
                            ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                            : "bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse"
                        }`}
                      >
                        {isExpired && app.status === "PENDING" ? "EXPIRED" : app.status}
                      </span>
                      {app.is_executed && (
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          ✓ EXECUTED
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold text-white mt-1 leading-snug">
                      {app.description}
                    </h3>
                  </div>

                  <div className="text-left sm:text-right text-[11px] text-slate-400 font-mono space-y-0.5 shrink-0">
                    <div className="flex items-center sm:justify-end gap-1.5">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <span>Created: {new Date(app.created_at).toLocaleTimeString()}</span>
                    </div>
                    {app.expires_at && (
                      <div className="text-amber-400 font-medium">
                        Expires: {new Date(app.expires_at).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Security verification details */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="truncate">
                    <span className="text-slate-300 font-semibold">Hash:</span>{" "}
                    <span className="text-slate-400 font-tabular">{app.action_hash}</span>
                  </div>
                  <div className="truncate">
                    <span className="text-slate-300 font-semibold">Nonce:</span>{" "}
                    <span className="text-slate-400 font-tabular">{app.execution_nonce || "N/A"}</span>
                  </div>
                </div>

                {/* Diff Viewer if code patch is attached */}
                {(app.payload?.diff || app.payload?.structured_diff) && (
                  <div className="mt-3">
                    <DiffViewer
                      rawDiff={app.payload?.diff}
                      structuredDiff={app.payload?.structured_diff}
                    />
                  </div>
                )}

                {/* Parameter preview */}
                <div className="mt-3">
                  <details className="text-xs text-slate-400">
                    <summary className="cursor-pointer hover:text-slate-200 select-none font-medium text-xs">
                      View Validated Parameters
                    </summary>
                    <pre className="mt-1.5 p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 overflow-x-auto text-xs font-mono leading-relaxed">
                      {JSON.stringify(app.payload, null, 2)}
                    </pre>
                  </details>
                </div>

                {/* Action buttons if pending */}
                {isPending && !isExpired && (
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                    <button
                      disabled={actionInProgress === app.id}
                      onClick={() => handleDecision(app, "REJECT")}
                      className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Reject Action
                    </button>
                    <button
                      disabled={actionInProgress === app.id}
                      onClick={() => handleDecision(app, "APPROVE")}
                      className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {actionInProgress === app.id ? "Executing..." : "Approve & Execute"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
