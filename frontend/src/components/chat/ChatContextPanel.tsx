"use client";

import React, { useState } from "react";
import {
  FolderGit2,
  GitBranch,
  Cpu,
  Boxes,
  Shield,
  Layers,
  Bug,
  GitPullRequest,
  FileSearch,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
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
        className="hidden xl:flex items-center justify-center w-8 h-full bg-[#0D1017] border-l border-[#252D3A] text-[#64748B] hover:text-[#F1F5F9] transition-colors cursor-pointer"
        title="Open context panel"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
    );
  }

  return (
    <aside className="hidden xl:flex flex-col w-72 h-full bg-[#0D1017] border-l border-[#252D3A] text-[#F1F5F9] select-none shrink-0 overflow-y-auto">
      {/* Header */}
      <div className="p-3.5 border-b border-[#252D3A] flex items-center justify-between">
        <span className="text-[11px] font-mono font-semibold text-[#64748B] uppercase tracking-wider">
          Workspace Context
        </span>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 rounded-md text-[#64748B] hover:text-[#F1F5F9] hover:bg-[#121722] transition-colors cursor-pointer"
          title="Collapse panel"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3.5 space-y-4 text-xs">
        {/* Active Target Repository */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono font-semibold text-[#64748B] uppercase tracking-wider">
            Active Target
          </label>
          <div className="p-2.5 rounded-lg bg-[#121722] border border-[#252D3A] space-y-1.5">
            <div className="flex items-center space-x-2 truncate">
              <FolderGit2 className="h-4 w-4 text-[#818CF8] shrink-0" />
              <span className="font-mono font-semibold text-[#F1F5F9] truncate">
                {activeRepo || "None selected"}
              </span>
            </div>
            {selectedRepoRecord && (
              <div className="flex items-center justify-between text-[11px] font-mono text-[#94A3B8] pt-1 border-t border-[#252D3A]">
                <div className="flex items-center space-x-1">
                  <GitBranch className="h-3 w-3 text-[#64748B]" />
                  <span>{selectedRepoRecord.default_branch || "main"}</span>
                </div>
                <span>{selectedRepoRecord.is_private ? "Private" : "Public"}</span>
              </div>
            )}
          </div>
        </div>

        {/* Engine & Model Specification */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono font-semibold text-[#64748B] uppercase tracking-wider">
            AI Engine & Model
          </label>
          <div className="p-2.5 rounded-lg bg-[#121722] border border-[#252D3A] space-y-1 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-[#94A3B8]">Provider:</span>
              <span className="font-semibold text-[#F1F5F9] capitalize">
                {activeProvider || "gemini"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#94A3B8]">Model:</span>
              <span className="text-[#818CF8] font-semibold truncate max-w-[130px]">
                {activeModel || "gemini-3.8-flash"}
              </span>
            </div>
          </div>
        </div>

        {/* Security & Tool Context */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono font-semibold text-[#64748B] uppercase tracking-wider">
            Security & Toolsets
          </label>
          <div className="p-2.5 rounded-lg bg-[#121722] border border-[#252D3A] space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 font-mono text-[11px]">
              <Shield className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Cryptographic HITL</span>
            </div>
            <div className="flex items-center space-x-2 text-[#94A3B8] font-mono text-[11px]">
              <Boxes className="h-3.5 w-3.5 text-[#818CF8] shrink-0" />
              <span>MCP Protocol (stdio)</span>
            </div>
          </div>
        </div>

        {/* Fast Action Shortcuts */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono font-semibold text-[#64748B] uppercase tracking-wider">
            Quick Actions
          </label>
          <div className="space-y-1.5">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (!isSending) sendUserMessage(action.prompt);
                  }}
                  disabled={isSending}
                  className="w-full flex items-center space-x-2 p-2 rounded-md bg-[#121722] hover:bg-[#171E2B] border border-[#252D3A] text-left transition-colors text-xs text-[#94A3B8] hover:text-[#F1F5F9] cursor-pointer disabled:opacity-40"
                >
                  <Icon className="h-3.5 w-3.5 text-[#818CF8] shrink-0" />
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
