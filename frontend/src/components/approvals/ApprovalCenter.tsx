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
    <div className="flex flex-col h-full bg-background text-foreground p-4 sm:p-6 md:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-inner">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Central Approval Center
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cryptographic action verification, Human-In-The-Loop gating, TTL expiration, and replay protection.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadApprovals}
          disabled={loading}
          className="self-start sm:self-auto flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-all interactive-card cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 mt-6 overflow-x-auto pb-1">
        {["ALL", "PENDING", "APPROVED", "REJECTED", "EXPIRED"].map((status) => {
          const isActive = selectedStatus === status;
          return (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3.5 py-1.5 text-xs font-mono font-semibold rounded-xl transition-all cursor-pointer ${
                isActive
                  ? "bg-primary text-white shadow-sm shadow-primary/25 border border-primary/40"
                  : "bg-secondary/70 border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {status}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="mt-6 space-y-4">
        {loading && (
          <div className="text-center py-12 text-muted-foreground text-xs font-mono">
            Loading approval records...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {!loading && approvals.length === 0 && (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl surface-card">
            <div className="w-12 h-12 rounded-2xl bg-secondary/80 text-muted-foreground flex items-center justify-center mx-auto mb-3 border border-border">
              <ShieldCheck className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-sm font-semibold text-foreground">No approval records found</div>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
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
              className="p-5 rounded-2xl surface-card interactive-card transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-primary/15 border border-primary/30 text-blue-400">
                      {app.tool_name}
                    </span>
                    {app.repo_name && (
                      <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-secondary text-foreground border border-border flex items-center gap-1">
                        <FolderGit2 className="h-3 w-3 text-primary" />
                        {app.repo_name}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full font-mono ${
                        isExpired
                          ? "bg-secondary text-muted-foreground border border-border"
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
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                        ✓ EXECUTED
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mt-2">{app.description}</h3>
                </div>

                <div className="text-left sm:text-right text-xs text-muted-foreground font-mono space-y-0.5 shrink-0">
                  <div className="flex items-center sm:justify-end gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Created: {new Date(app.created_at).toLocaleTimeString()}</span>
                  </div>
                  {app.expires_at && (
                    <div className="text-amber-400/90 font-medium">
                      Expires: {new Date(app.expires_at).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Security verification details */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono text-muted-foreground bg-secondary/60 p-3 rounded-xl border border-border">
                <div className="truncate">
                  <span className="text-foreground font-semibold">Hash (SHA-256):</span>{" "}
                  <span className="text-foreground/90 font-tabular">{app.action_hash}</span>
                </div>
                <div className="truncate">
                  <span className="text-foreground font-semibold">Nonce:</span>{" "}
                  <span className="text-foreground/90 font-tabular">{app.execution_nonce || "N/A"}</span>
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
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground select-none font-medium">
                    View Exact Validated Parameters
                  </summary>
                  <pre className="mt-2 p-3 rounded-xl bg-background/90 border border-border text-foreground/90 overflow-x-auto text-[11px] font-mono">
                    {JSON.stringify(app.payload, null, 2)}
                  </pre>
                </details>
              </div>

              {/* Action buttons if pending */}
              {isPending && !isExpired && (
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-end gap-3">
                  <button
                    disabled={actionInProgress === app.id}
                    onClick={() => handleDecision(app, "REJECT")}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-all cursor-pointer disabled:opacity-50"
                  >
                    Reject Action
                  </button>
                  <button
                    disabled={actionInProgress === app.id}
                    onClick={() => handleDecision(app, "APPROVE")}
                    className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/25 transition-all cursor-pointer disabled:opacity-50"
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
