"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  Calendar,
  Hash,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Code2,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { fetchAuditEvents, AuditEvent } from "@/lib/api";

export default function ActivityPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await fetchAuditEvents(filterType || undefined);
      setEvents(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [filterType]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#252D3A] gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
              <Activity className="h-6 w-6 text-[#818CF8]" />
              <span>Activity & Execution History</span>
            </h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Chronological, tamper-evident log of all agent runs, cryptographic approvals, and tool invocations.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 self-start sm:self-auto">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs font-mono bg-[#121722] border border-[#252D3A] rounded-md px-3 py-1.5 text-[#F1F5F9] focus:outline-none focus:border-[#818CF8]"
            >
              <option value="">All Events</option>
              <option value="APPROVAL_REQUESTED">APPROVAL_REQUESTED</option>
              <option value="APPROVAL_DECISION">APPROVAL_DECISION</option>
              <option value="AGENT_EXECUTION_COMPLETED">AGENT_EXECUTION_COMPLETED</option>
            </select>

            <button
              onClick={loadEvents}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#121722] hover:bg-[#171E2B] text-[#F1F5F9] text-xs font-semibold rounded-md border border-[#252D3A] transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#818CF8] ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Activity Table */}
        <div className="rounded-xl surface-card overflow-hidden border border-[#252D3A]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0D1017] text-[#64748B] font-mono border-b border-[#252D3A]">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Event Type</th>
                  <th className="p-3.5">Tool / Action</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Cryptographic Signature</th>
                  <th className="p-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252D3A]">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#64748B] font-mono">
                      No activity events recorded yet. Run agent commands in the workspace.
                    </td>
                  </tr>
                ) : (
                  events.map((e) => (
                    <tr key={e.id} className="hover:bg-[#171E2B]/50 transition-colors">
                      <td className="p-3.5 font-mono text-[#64748B] whitespace-nowrap font-tabular">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="h-3.5 w-3.5 text-[#818CF8]" />
                          <span>{new Date(e.timestamp).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono font-medium text-[#F1F5F9]">
                        <span className="px-2 py-0.5 rounded bg-[#0D1017] border border-[#252D3A]">
                          {e.event_type}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[#818CF8]">{e.tool_name || "—"}</td>
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
                      <td className="p-3.5 font-mono text-[#64748B] max-w-xs truncate">
                        {e.action_hash ? (
                          <div className="flex items-center space-x-1.5">
                            <span className="truncate font-tabular text-[#94A3B8]">{e.action_hash}</span>
                            <button
                              onClick={() => copyToClipboard(e.action_hash || "")}
                              className="text-[#64748B] hover:text-[#F1F5F9] cursor-pointer"
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
                          <summary className="text-[#818CF8] hover:underline font-mono text-[11px] select-none flex items-center gap-1">
                            <Code2 className="h-3 w-3" />
                            <span>Payload</span>
                          </summary>
                          <pre className="mt-2 p-2.5 rounded bg-[#090B10] border border-[#252D3A] text-[10px] font-mono text-[#F1F5F9] max-h-36 overflow-auto">
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
