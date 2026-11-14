"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Sparkles,
  Database,
  ChevronDown,
  Search,
  Bell,
  Command,
  Key,
} from "lucide-react";
import { useChatStore } from "@/store/use-chat-store";
import { RepoCombobox } from "@/components/layout/RepoCombobox";
import { fetchHealth } from "@/lib/api";

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Overview",
  "/chat": "AI Chat",
  "/repositories": "Repositories",
  "/issues": "Issues",
  "/pull-requests": "Pull Requests",
  "/agents": "Agent Runs",
  "/coding-tasks": "Coding Tasks",
  "/approvals": "Approvals",
  "/activity": "Activity",
  "/integrations": "MCP Integrations",
  "/settings/general": "General Settings",
  "/settings/models": "Model Settings",
  "/settings/github": "Connected Accounts",
};

export function AppHeader() {
  const pathname = usePathname();
  const {
    toggleSidebar,
    activeProvider,
    activeModel,
    setModelModalOpen,
    githubUser,
    setAuthModalOpen,
  } = useChatStore();

  const [health, setHealth] = useState<{ status: string; default_provider: string } | null>(null);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: "offline", default_provider: "gemini" }));
  }, []);

  const currentLabel = ROUTE_LABELS[pathname] || pathname.split("/").filter(Boolean).pop() || "Workspace";

  return (
    <header className="h-12 border-b border-[#252D3A] bg-[#090B10] px-3 sm:px-5 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="p-1 rounded-md text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#121722] md:hidden transition-colors cursor-pointer"
          aria-label="Toggle navigation sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center space-x-1.5 text-xs font-medium">
          <span className="text-[#64748B] hidden sm:inline">Workspace</span>
          <span className="text-[#64748B] hidden sm:inline">/</span>
          <span className="text-[#F1F5F9] font-semibold">{currentLabel}</span>
        </div>
      </div>

      {/* Center: Repository Selector & Search */}
      <div className="flex items-center space-x-2">
        <RepoCombobox />

        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#121722] border border-[#252D3A] text-xs text-[#64748B]">
          <Search className="h-3.5 w-3.5" />
          <span className="text-[11px] font-mono">Search or run command...</span>
          <kbd className="text-[10px] bg-[#171E2B] px-1.5 py-0.5 rounded text-[#94A3B8] font-mono border border-[#252D3A]">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Engine Pill, Health, User */}
      <div className="flex items-center space-x-2">
        {/* Engine selector */}
        <button
          type="button"
          onClick={() => setModelModalOpen(true)}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md border border-[#252D3A] bg-[#121722] hover:bg-[#171E2B] font-mono text-[11px] transition-all cursor-pointer"
          title="Change active LLM provider and model"
        >
          <Sparkles className="h-3 w-3 text-[#818CF8]" />
          <span className="text-[#94A3B8] hidden sm:inline">Engine:</span>
          <span className="capitalize font-semibold text-[#F1F5F9]">
            {activeProvider || "gemini"}
          </span>
          <span className="text-[10px] text-[#64748B] font-normal truncate max-w-[90px] hidden md:inline font-tabular">
            ({(activeModel || "gemini-3.8-flash").split("/").pop()})
          </span>
          <ChevronDown className="h-3 w-3 text-[#64748B]" />
        </button>

        {/* Backend Health Badge */}
        <div className="hidden xl:flex items-center space-x-1.5 px-2 py-1 rounded-md border border-[#252D3A] bg-[#121722] font-mono text-[11px]">
          <Database className="h-3 w-3 text-emerald-400" />
          {health?.status === "ok" ? (
            <span className="flex items-center text-emerald-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              API Online
            </span>
          ) : (
            <span className="flex items-center text-amber-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mr-1.5" />
              API Offline
            </span>
          )}
        </div>

        {/* User avatar / Connect button */}
        {githubUser ? (
          <button
            onClick={() => setAuthModalOpen(true)}
            className="flex items-center space-x-1.5 p-1 rounded-md border border-[#252D3A] bg-[#121722] hover:bg-[#171E2B] cursor-pointer"
            title={`Connected as @${githubUser.login}`}
          >
            {githubUser.avatar_url ? (
              <img
                src={githubUser.avatar_url}
                alt={githubUser.login}
                className="w-5 h-5 rounded-full border border-indigo-500/40"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-[#818CF8]/20 text-[#818CF8] flex items-center justify-center text-[10px] font-bold">
                {githubUser.login.substring(0, 2).toUpperCase()}
              </div>
            )}
          </button>
        ) : (
          <button
            onClick={() => setAuthModalOpen(true)}
            className="flex items-center space-x-1 px-2 py-1 text-xs font-medium bg-[#171E2B] text-[#818CF8] hover:bg-[#121722] border border-indigo-500/30 rounded-md transition-colors cursor-pointer"
          >
            <Key className="h-3 w-3" />
            <span className="hidden sm:inline">Connect</span>
          </button>
        )}
      </div>
    </header>
  );
}
