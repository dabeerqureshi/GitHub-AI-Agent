"use client";

import React, { useEffect, useState } from "react";
import {
  Boxes,
  Server,
  Terminal,
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
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
        {/* Page Header */}
        <div className="pb-5 border-b border-slate-800">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Boxes className="h-6 w-6 text-indigo-400" />
            <span>Model Context Protocol (MCP) Integrations</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Protocol-standardized server connections, runtime tools, and execution environments.
          </p>
        </div>

        {/* Server Status Banner */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-sm text-white">
                  @modelcontextprotocol/server-github
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Connected
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Transport: {health?.mcp_transport || "stdio"} • Service: {health?.service || "github-ai-workspace-backend"}
              </p>
            </div>
          </div>
        </div>

        {/* Discovered Toolsets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {toolsets.map((ts) => (
            <div key={ts.group} className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-indigo-400">{ts.group}</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-400">
                  {ts.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">{ts.description}</p>
              <div className="pt-3 border-t border-slate-800">
                <div className="text-[10px] font-mono text-slate-500 uppercase mb-2">
                  Available Tools
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ts.tools.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-md text-xs font-mono bg-slate-950 border border-slate-800 text-slate-300"
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
