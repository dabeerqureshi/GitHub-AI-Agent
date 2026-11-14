"use client";

import React, { useState } from "react";
import {
  FolderGit2,
  GitBranch,
  Boxes,
  Shield,
  Layers,
  Bug,
  GitPullRequest,
  FileSearch,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useChatStore } from "@/store/use-chat-store";

export function ChatContextPanel() {
  const {
    activeRepo,
    activeProvider,
    activeModel,
    repositories,
    sendUserMessage,
    isSending,
  } = useChatStore();

  const [isCollapsed, setIsCollapsed] = useState(false);

  const selectedRepoRecord = repositories.find((r) => r.full_name === activeRepo);

  const quickActions = [
    {
      label: "Architecture Breakdown",
      prompt: `Explain architecture of ${activeRepo || "the repository"}`,
      icon: Layers,
    },
    {
      label: "Find Open Defects",
      prompt: `Find open issues and bug reports in ${activeRepo || "the repository"}`,
      icon: Bug,
    },
    {
      label: "Review Recent Diffs",
      prompt: `Review recent pull requests and diffs in ${activeRepo || "the repository"}`,
      icon: GitPullRequest,
    },
    {
      label: "Examine CI Workflows",
      prompt: `Analyze failing CI workflow runs in ${activeRepo || "the repository"}`,
      icon: FileSearch,
    },
  ];

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="hidden xl:flex items-center justify-center w-7 h-full bg-slate-900 border-l border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
        title="Open repository context panel"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
    );
  }

  return (
    <aside className="hidden xl:flex flex-col w-64 h-full bg-slate-900/80 border-l border-slate-800 text-slate-200 select-none shrink-0 overflow-y-auto font-sans text-xs">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Context Inspector
        </span>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Collapse panel"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3 space-y-4">
        {/* Active Target Repository */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Target Repository
          </label>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center space-x-2 truncate">
              <FolderGit2 className="h-4 w-4 text-indigo-400 shrink-0" />
              <span className="font-medium text-white truncate text-xs">
                {activeRepo || "None selected"}
              </span>
            </div>
            {selectedRepoRecord && (
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-800/80">
                <div className="flex items-center space-x-1">
                  <GitBranch className="h-3 w-3 text-slate-500" />
                  <span className="font-mono">{selectedRepoRecord.default_branch || "main"}</span>
                </div>
                <span>{selectedRepoRecord.is_private ? "Private" : "Public"}</span>
              </div>
            )}
          </div>
        </div>

        {/* Engine & Model Specification */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Active Engine
          </label>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Provider:</span>
              <span className="font-medium text-white capitalize">
                {activeProvider || "gemini"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Model:</span>
              <span className="text-indigo-400 font-medium font-mono text-[11px] truncate max-w-[130px]">
                {activeModel || "gemini-3.8-flash"}
              </span>
            </div>
          </div>
        </div>

        {/* Security & Tool Context */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Security &amp; Protocol
          </label>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center space-x-2 text-emerald-400">
              <Shield className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">Cryptographic HITL</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-400">
              <Boxes className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span>MCP Protocol (stdio)</span>
            </div>
          </div>
        </div>

        {/* Fast Action Shortcuts */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Quick Actions
          </label>
          <div className="space-y-1">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (!isSending) sendUserMessage(action.prompt);
                  }}
                  disabled={isSending}
                  className="w-full flex items-center space-x-2.5 p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-left transition-all text-xs text-slate-300 hover:text-white cursor-pointer disabled:opacity-40"
                >
                  <Icon className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span className="truncate">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
