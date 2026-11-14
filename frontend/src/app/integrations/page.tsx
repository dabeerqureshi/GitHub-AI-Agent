"use client";

import React, { useEffect, useState } from "react";
import {
  Boxes,
  Server,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Terminal,
  ExternalLink,
  Shield,
  Layers,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { fetchHealth } from "@/lib/api";

export default function IntegrationsPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: "offline", mcp_transport: "stdio" }))
      .finally(() => setLoading(false));
  }, []);

  const toolsets = [
    {
      group: "github_read",
      description: "Read issues, pull requests, commits, branches, repository trees, and files",
      tools: ["search_repositories", "get_file_contents", "list_issues", "get_pull_request", "list_commits"],
      status: "Discovered & Active",
      readOnly: true,
    },
    {
      group: "github_write",
      description: "Create/update issues, open pull requests, merge PRs, and comment on reviews",
      tools: ["create_issue", "update_issue", "create_pull_request", "merge_pull_request", "add_comment"],
      status: "HITL Gated (Write Approvals)",
      readOnly: false,
    },
    {
      group: "git_local",
      description: "Local git worktree manipulation, branch checkouts, staging, and diff synthesis",
      tools: ["clone_repository", "checkout_branch", "git_status", "create_branch", "synthesize_diff"],
      status: "Active",
      readOnly: false,
    },
    {
      group: "test_runner",
      description: "Isolated automated test execution and coverage verification in local workspaces",
      tools: ["run_pytest", "run_npm_test", "run_linter", "parse_test_output"],
      status: "Active",
      readOnly: true,
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#2b2b2b] gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#ffffff] flex items-center gap-2">
              <Boxes className="h-6 w-6 text-[#007acc]" />
              <span>Model Context Protocol (MCP) Integrations</span>
            </h1>
            <p className="text-xs text-[#8c8c8c] mt-0.5">
              Protocol-standardized server connections, runtime tools, and execution environments.
            </p>
          </div>
        </div>

        {/* Server Status Banner */}
        <div className="p-5 rounded-md bg-[#252526] border border-[#2b2b2b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-lg bg-indigo-500/15 text-[#007acc] border border-indigo-500/30">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm text-[#ffffff]">
                  @modelcontextprotocol/server-github
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Connected
                </span>
              </div>
              <p className="text-xs text-[#8c8c8c] mt-0.5 font-mono">
                Transport: {health?.mcp_transport || "stdio"} • Service: {health?.service || "github-ai-workspace-backend"}
              </p>
            </div>
          </div>
        </div>

        {/* Discovered Toolsets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {toolsets.map((ts) => (
            <div key={ts.group} className="p-4 rounded-md bg-[#252526] border border-[#2b2b2b] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#007acc]">{ts.group}</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#1e1e1e] border border-[#2b2b2b] text-[#8c8c8c]">
                  {ts.status}
                </span>
              </div>
              <p className="text-xs text-[#8c8c8c]">{ts.description}</p>
              <div className="pt-2 border-t border-[#2b2b2b]">
                <div className="text-[10px] font-mono text-[#8c8c8c] uppercase mb-1.5">
                  Available Tools
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ts.tools.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#1e1e1e] border border-[#2b2b2b] text-[#ffffff]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
