"use client";

import React, { useCallback, useEffect, useState } from "react";
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
  Hash,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FolderGit2,
  Terminal,
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
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#cccccc] p-4 sm:p-6 md:p-8 overflow-y-auto font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#2b2b2b] gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Central Approval Center
              </h1>
              <p className="text-xs text-[#858585] mt-0.5">
                Cryptographic action verification, Human-In-The-Loop gating, TTL expiration, and replay protection.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadApprovals}
          disabled={loading}
          className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded bg-[#252526] hover:bg-[#2a2d2e] border border-[#2b2b2b] hover:border-[#007acc] text-[#cccccc] transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin text-[#007acc]" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 mt-4 overflow-x-auto pb-1">
        {["ALL", "PENDING", "APPROVED", "REJECTED", "EXPIRED"].map((status) => {
          const isActive = selectedStatus === status;
          return (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors cursor-pointer ${
                isActive
                  ? "bg-[#007acc] text-white border border-[#007acc]"
                  : "bg-[#252526] border border-[#2b2b2b] text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]"
              }`}
            >
              {status}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="mt-4 space-y-3">
        {loading && (
          <div className="text-center py-10 text-[#858585] text-xs font-mono">
            Loading approval records...
          </div>
        )}

        {error && (
          <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
            {error}
          </div>
        )}

        {!loading && approvals.length === 0 && (
          <div className="text-center py-12 border border-[#2b2b2b] rounded bg-[#252526]">
            <div className="w-9 h-9 rounded bg-[#1e1e1e] text-[#858585] flex items-center justify-center mx-auto mb-2.5 border border-[#2b2b2b]">
              <ShieldCheck className="h-4 w-4 text-[#007acc]" />
            </div>
            <div className="text-xs font-semibold text-white">No approval records found</div>
            <p className="text-[11px] text-[#858585] mt-0.5 max-w-sm mx-auto">
              Mutating actions requiring cryptographic confirmation will appear here in real time.
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
              className="p-3.5 rounded bg-[#252526] border border-[#2b2b2b] hover:border-[#007acc] transition-colors font-mono"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.2 rounded bg-[#007acc]/15 border border-[#007acc]/30 text-[#007acc]">
                      {app.tool_name}
                    </span>
                    {app.repo_name && (
                      <span className="text-[11px] font-mono px-2 py-0.2 rounded bg-[#1e1e1e] text-[#cccccc] border border-[#2b2b2b] flex items-center gap-1">
                        <FolderGit2 className="h-3 w-3 text-[#007acc]" />
                        {app.repo_name}
                      </span>
                    )}
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded font-mono ${
                        isExpired
                          ? "bg-[#1e1e1e] text-[#858585] border border-[#2b2b2b]"
                          : app.status === "APPROVED"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : app.status === "REJECTED"
                          ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          : "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse"
                      }`}
                    >
                      {isExpired && app.status === "PENDING" ? "EXPIRED" : app.status}
                    </span>
                    {app.is_executed && (
                      <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                        ✓ EXECUTED
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs sm:text-sm font-semibold text-white mt-1">{app.description}</h3>
                </div>

                <div className="text-left sm:text-right text-[10px] text-[#858585] font-mono space-y-0.5 shrink-0">
                  <div className="flex items-center sm:justify-end gap-1">
                    <Clock className="h-3 w-3 text-[#858585]" />
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
              <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono text-[#858585] bg-[#1e1e1e] p-2 rounded border border-[#2b2b2b]">
                <div className="truncate">
                  <span className="text-white font-semibold">Hash:</span>{" "}
                  <span className="text-[#cccccc] font-tabular">{app.action_hash}</span>
                </div>
                <div className="truncate">
                  <span className="text-white font-semibold">Nonce:</span>{" "}
                  <span className="text-[#cccccc] font-tabular">{app.execution_nonce || "N/A"}</span>
                </div>
              </div>

              {/* Diff Viewer if code patch is attached */}
              {(app.payload?.diff || app.payload?.structured_diff) && (
                <div className="mt-2.5">
                  <DiffViewer
                    rawDiff={app.payload?.diff}
                    structuredDiff={app.payload?.structured_diff}
                  />
                </div>
              )}

              {/* Parameter preview */}
              <div className="mt-2">
                <details className="text-xs text-[#858585]">
                  <summary className="cursor-pointer hover:text-[#cccccc] select-none font-medium text-[10px]">
                    View Validated Parameters
                  </summary>
                  <pre className="mt-1 p-2 rounded bg-[#1e1e1e] border border-[#2b2b2b] text-[#cccccc] overflow-x-auto text-[10px] font-mono">
                    {JSON.stringify(app.payload, null, 2)}
                  </pre>
                </details>
              </div>

              {/* Action buttons if pending */}
              {isPending && !isExpired && (
                <div className="mt-3 pt-2.5 border-t border-[#2b2b2b] flex items-center justify-end gap-2">
                  <button
                    disabled={actionInProgress === app.id}
                    onClick={() => handleDecision(app, "REJECT")}
                    className="px-3 py-1 text-xs font-medium rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Reject Action
                  </button>
                  <button
                    disabled={actionInProgress === app.id}
                    onClick={() => handleDecision(app, "APPROVE")}
                    className="px-3.5 py-1 text-xs font-medium rounded bg-[#007acc] hover:bg-[#0e639c] text-white shadow-xs transition-colors cursor-pointer disabled:opacity-40"
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
