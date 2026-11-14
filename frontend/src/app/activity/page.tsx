"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { fetchAuditEvents, AuditEvent } from "@/lib/api";
import {
  Activity,
  RefreshCw,
  Calendar,
  Check,
  Copy,
  Code2,
} from "lucide-react";

export default function ActivityPage() {
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
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Activity className="h-6 w-6 text-indigo-400" />
              <span>Activity &amp; Execution History</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Chronological, tamper-evident log of all agent runs, cryptographic approvals, and tool invocations.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 self-start sm:self-auto">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
            >
              <option value="" className="bg-slate-900 text-white">All Events</option>
              <option value="APPROVAL_REQUESTED" className="bg-slate-900 text-white">APPROVAL_REQUESTED</option>
              <option value="APPROVAL_DECISION" className="bg-slate-900 text-white">APPROVAL_DECISION</option>
              <option value="AGENT_EXECUTION_COMPLETED" className="bg-slate-900 text-white">AGENT_EXECUTION_COMPLETED</option>
            </select>

            <button
              onClick={loadEvents}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-indigo-400 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Activity Table */}
        <div className="rounded-xl bg-slate-900 overflow-hidden border border-slate-800 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Event Type</th>
                  <th className="p-3.5">Tool / Action</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Cryptographic Signature</th>
                  <th className="p-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500 font-mono">
                      No activity events recorded yet. Run agent commands in the workspace.
                    </td>
                  </tr>
                ) : (
                  events.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 font-mono text-slate-400 whitespace-nowrap font-tabular">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                          <span>{new Date(e.timestamp).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono font-medium text-white">
                        <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300">
                          {e.event_type}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-indigo-400 font-semibold">{e.tool_name || "—"}</td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full border ${
                            e.status === "SUCCESS" || e.status === "APPROVED"
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : e.status === "PENDING"
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {e.status}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-400 max-w-xs truncate">
                        {e.action_hash ? (
                          <div className="flex items-center space-x-1.5">
                            <span className="truncate font-tabular text-slate-300">{e.action_hash}</span>
                            <button
                              onClick={() => copyToClipboard(e.action_hash || "")}
                              className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                              title="Copy hash"
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
                      <td className="p-3.5 text-right">
                        <details className="cursor-pointer inline-block text-left">
                          <summary className="text-indigo-400 hover:underline font-mono text-[11px] select-none flex items-center gap-1">
                            <Code2 className="h-3 w-3" />
                            <span>Payload</span>
                          </summary>
                          <pre className="mt-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-200 max-h-36 overflow-auto">
                            {JSON.stringify(e.details, null, 2)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
