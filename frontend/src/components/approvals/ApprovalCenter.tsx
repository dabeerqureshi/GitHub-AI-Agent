"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ApprovalRequest,
  decideApproval,
  fetchAllApprovals,
} from "@/lib/api";
import { DiffViewer } from "@/components/chat/DiffViewer";

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
        reviewer_notes: notes || (decision === "APPROVE" ? "Approved in Approval Center" : "Rejected in Approval Center"),
      });
      await loadApprovals();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-slate-100 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-amber-400">🛡️</span> Central Approval Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Human-in-the-Loop write gating, cryptographic action verification, TTL expiration, and replay protection.
          </p>
        </div>
        <button
          onClick={loadApprovals}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mt-6">
        {["ALL", "PENDING", "APPROVED", "REJECTED", "EXPIRED"].map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              selectedStatus === status
                ? "bg-blue-600 text-white"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-6 space-y-4">
        {loading && (
          <div className="text-center py-12 text-slate-500 text-sm">
            Loading approval records...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {error}
          </div>
        )}

        {!loading && approvals.length === 0 && (
          <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl bg-slate-900/50">
            <div className="text-3xl mb-2">📋</div>
            <div className="text-sm font-medium text-slate-300">No approval records found</div>
            <p className="text-xs text-slate-500 mt-1">
              Mutating actions requiring confirmation will appear here.
            </p>
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
              className="p-5 rounded-xl border border-slate-800 bg-slate-900/90 shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                      {app.tool_name}
                    </span>
                    {app.repo_name && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {app.repo_name}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isExpired
                          ? "bg-slate-700 text-slate-400"
                          : app.status === "APPROVED"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : app.status === "REJECTED"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                      }`}
                    >
                      {isExpired && app.status === "PENDING" ? "EXPIRED" : app.status}
                    </span>
                    {app.is_executed && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-700/50">
                        ✓ EXECUTED
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200 mt-2">{app.description}</h3>
                </div>

                <div className="text-right text-xs text-slate-500 space-y-1">
                  <div>Created: {new Date(app.created_at).toLocaleTimeString()}</div>
                  {app.expires_at && (
                    <div className="text-amber-400/80">
                      Expires: {new Date(app.expires_at).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Security verification details */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="truncate">
                  <span className="text-slate-500">Hash (SHA-256):</span> {app.action_hash}
                </div>
                <div className="truncate">
                  <span className="text-slate-500">Nonce:</span> {app.execution_nonce || "N/A"}
                </div>
              </div>

              {/* Diff Viewer if code patch is attached */}
              {(app.payload?.diff || app.payload?.structured_diff) && (
                <div className="mt-4">
                  <DiffViewer
                    rawDiff={app.payload?.diff}
                    structuredDiff={app.payload?.structured_diff}
                  />
                </div>
              )}

              {/* Parameter preview */}
              <div className="mt-3">
                <details className="text-xs text-slate-400">
                  <summary className="cursor-pointer hover:text-slate-200 select-none">
                    View Exact Validated Parameters
                  </summary>
                  <pre className="mt-2 p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-300 overflow-x-auto text-[11px]">
                    {JSON.stringify(app.payload, null, 2)}
                  </pre>
                </details>
              </div>

              {/* Action buttons if pending */}
              {isPending && !isExpired && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-end gap-3">
                  <button
                    disabled={actionInProgress === app.id}
                    onClick={() => handleDecision(app, "REJECT")}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-colors disabled:opacity-50"
                  >
                    Reject Action
                  </button>
                  <button
                    disabled={actionInProgress === app.id}
                    onClick={() => handleDecision(app, "APPROVE")}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors disabled:opacity-50"
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
  );
}
