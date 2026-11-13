"use client";

import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { fetchAuditEvents, AuditEvent } from "@/lib/api";
import { ShieldCheck, RefreshCw, Hash, Calendar, CheckCircle2, AlertCircle } from "lucide-react";

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("");

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await fetchAuditEvents(filterType || undefined);
      setEvents(data);
    } catch (err) {
      console.error("Failed to load audit events", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [filterType]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center space-x-2">
              <ShieldCheck className="h-6 w-6 text-emerald-500" />
              <span>Immutable Security Audit Log</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Tamper-evident trail of all AI instructions, cryptographic approvals, tool actions, and execution outcomes.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs bg-card border rounded-md px-3 py-1.5 focus:outline-none"
            >
              <option value="">All Event Types</option>
              <option value="APPROVAL_REQUESTED">APPROVAL_REQUESTED</option>
              <option value="APPROVAL_DECISION">APPROVAL_DECISION</option>
              <option value="AGENT_EXECUTION_COMPLETED">AGENT_EXECUTION_COMPLETED</option>
            </select>

            <button
              onClick={loadEvents}
              disabled={loading}
              className="flex items-center space-x-1 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-xs rounded-md border transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No audit events recorded yet. Perform agent interactions in the workspace to generate audit records.
          </div>
        ) : (
          <div className="border rounded-lg bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Event Type</th>
                    <th className="p-3">Tool / Action</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Action Hash Signature</th>
                    <th className="p-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {events.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3 whitespace-nowrap font-mono text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(e.timestamp).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap font-semibold">
                        <span className="px-2 py-0.5 rounded border bg-background font-mono text-[11px]">
                          {e.event_type}
                        </span>
                      </td>
                      <td className="p-3 font-mono">{e.tool_name || "—"}</td>
                      <td className="p-3 whitespace-nowrap">
                        {e.status === "SUCCESS" || e.status === "APPROVED" ? (
                          <span className="flex items-center text-emerald-500 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            {e.status}
                          </span>
                        ) : e.status === "PENDING" ? (
                          <span className="flex items-center text-amber-500 font-medium">
                            <AlertCircle className="h-3.5 w-3.5 mr-1" />
                            PENDING
                          </span>
                        ) : (
                          <span className="flex items-center text-rose-500 font-medium">
                            <AlertCircle className="h-3.5 w-3.5 mr-1" />
                            {e.status}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-muted-foreground max-w-xs truncate" title={e.action_hash || ""}>
                        {e.action_hash ? (
                          <div className="flex items-center space-x-1">
                            <Hash className="h-3 w-3 shrink-0" />
                            <span className="truncate">{e.action_hash}</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3">
                        <details className="cursor-pointer">
                          <summary className="text-primary hover:underline text-[11px]">View JSON</summary>
                          <pre className="mt-2 p-2 rounded bg-background border text-[10px] font-mono max-h-32 overflow-auto">
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
      </main>
    </div>
  );
}
