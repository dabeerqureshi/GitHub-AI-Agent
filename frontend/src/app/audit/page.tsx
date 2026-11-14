"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { fetchAuditEvents, AuditEvent } from "@/lib/api";
import {
  ShieldCheck,
  RefreshCw,
  Hash,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Code2,
} from "lucide-react";

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAuditEvents(filterType || undefined);
      setEvents(data);
    } catch (err) {
      console.error("Failed to load audit events", err);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-inner">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Immutable Security Audit Log
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tamper-evident trail of all AI instructions, cryptographic approvals, tool actions, and execution outcomes.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 self-start sm:self-auto">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
            >
              <option value="" className="bg-slate-900 text-white">All Event Types</option>
              <option value="APPROVAL_REQUESTED" className="bg-slate-900 text-white">APPROVAL_REQUESTED</option>
              <option value="APPROVAL_DECISION" className="bg-slate-900 text-white">APPROVAL_DECISION</option>
              <option value="AGENT_EXECUTION_COMPLETED" className="bg-slate-900 text-white">AGENT_EXECUTION_COMPLETED</option>
            </select>

            <button
              onClick={loadEvents}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-xl border border-border transition-all interactive-card cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl surface-card">
            <div className="w-12 h-12 rounded-2xl bg-secondary/80 text-muted-foreground flex items-center justify-center mx-auto mb-3 border border-border">
              <ShieldCheck className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-sm font-semibold text-foreground">No audit events recorded yet</div>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Execute actions in the workspace to generate cryptographic audit records.
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-2xl surface-card overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/70 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Event Type</th>
                    <th className="p-3.5">Tool / Action</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Action Hash Signature</th>
                    <th className="p-3.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {events.map((e) => (
                    <tr key={e.id} className="hover:bg-secondary/40 transition-colors">
                      <td className="p-3.5 whitespace-nowrap font-mono text-muted-foreground font-tabular">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>{new Date(e.timestamp).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap font-semibold">
                        <span className="px-2.5 py-1 rounded-lg border border-border bg-secondary font-mono text-[11px] text-foreground">
                          {e.event_type}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-blue-400 font-semibold">{e.tool_name || "—"}</td>
                      <td className="p-3.5 whitespace-nowrap">
                        {e.status === "SUCCESS" || e.status === "APPROVED" ? (
                          <span className="inline-flex items-center text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 font-mono text-[11px]">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {e.status}
                          </span>
                        ) : e.status === "PENDING" ? (
                          <span className="inline-flex items-center text-amber-400 font-medium px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 font-mono text-[11px] animate-pulse">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            PENDING
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-rose-400 font-medium px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 font-mono text-[11px]">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {e.status}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono text-muted-foreground max-w-xs truncate" title={e.action_hash || ""}>
                        {e.action_hash ? (
                          <div className="flex items-center space-x-1.5">
                            <Hash className="h-3 w-3 shrink-0 text-primary" />
                            <span className="truncate font-tabular text-foreground/90">{e.action_hash}</span>
                            <button
                              onClick={() => copyToClipboard(e.action_hash || "")}
                              className="text-muted-foreground hover:text-foreground transition-colors ml-1 p-0.5"
                              title="Copy hash signature"
                            >
                              {copiedHash === e.action_hash ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3.5">
                        <details className="cursor-pointer">
                          <summary className="text-primary hover:underline text-[11px] font-mono select-none flex items-center gap-1">
                            <Code2 className="h-3 w-3" />
                            <span>View JSON</span>
                          </summary>
                          <pre className="mt-2 p-3 rounded-xl bg-background/90 border border-border text-[10px] font-mono max-h-36 overflow-auto text-foreground">
                            {JSON.stringify(e.details, null, 2)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
