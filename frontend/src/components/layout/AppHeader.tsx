"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Menu,
  Database,
  ChevronDown,
  Search,
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

  const currentLabel =
    (pathname && ROUTE_LABELS[pathname]) ||
    (pathname ? pathname.split("/").filter(Boolean).pop() : undefined) ||
    "Workspace";

  return (
    <header className="h-9 border-b border-[#2b2b2b] bg-[#1e1e1e] px-3 sm:px-4 flex items-center justify-between sticky top-0 z-30 select-none font-sans text-[#cccccc]">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center space-x-2.5">
        <button
          type="button"
          onClick={toggleSidebar}
          className="p-1 rounded text-[#8c8c8c] hover:text-[#ffffff] hover:bg-[#2a2d2e] md:hidden transition-colors cursor-pointer"
          aria-label="Toggle navigation sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center space-x-1.5 text-xs">
          <span className="text-[#8c8c8c] hidden sm:inline">VS CODE</span>
          <span className="text-[#8c8c8c] hidden sm:inline">/</span>
          <span className="text-[#ffffff] font-medium uppercase">{currentLabel}</span>
        </div>
      </div>

      {/* Center: Repository Selector & Search */}
      <div className="flex items-center space-x-2">
        <RepoCombobox />

        <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#252526] border border-[#3c3c3c] text-xs text-[#8c8c8c]">
          <Search className="h-3 w-3" />
          <span className="text-[10px]">Search files or actions...</span>
          <kbd className="text-[9px] bg-[#1e1e1e] px-1 rounded text-[#cccccc] border border-[#3c3c3c]">
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
          className="flex items-center space-x-1.5 px-2 py-0.5 rounded border border-[#3c3c3c] bg-[#252526] hover:border-[#007acc] text-[11px] transition-all cursor-pointer"
          title="Change active LLM provider and model"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#007acc] animate-pulse" />
          <span className="text-[#8c8c8c] hidden sm:inline text-[10px]">ENGINE:</span>
          <span className="capitalize font-semibold text-[#ffffff]">
            {activeProvider || "gemini"}
          </span>
          <span className="text-[10px] text-[#38bdf8] font-normal truncate max-w-[90px] hidden md:inline font-mono">
            ({(activeModel || "gemini-3.8-flash").split("/").pop()})
          </span>
          <ChevronDown className="h-3 w-3 text-[#8c8c8c]" />
        </button>

        {/* Backend Health Badge */}
        <div className="hidden xl:flex items-center space-x-1.5 px-2 py-0.5 rounded border border-[#3c3c3c] bg-[#252526] text-[10px]">
          <Database className="h-3 w-3 text-[#007acc]" />
          {health?.status === "ok" ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span>ONLINE</span>
            </span>
          ) : (
            <span className="text-amber-400 font-semibold">OFFLINE</span>
          )}
        </div>

        {/* User avatar / Connect button */}
        {githubUser ? (
          <button
            onClick={() => setAuthModalOpen(true)}
            className="flex items-center space-x-1.5 p-0.5 rounded border border-[#3c3c3c] bg-[#252526] hover:border-[#007acc] cursor-pointer"
            title={`Connected as @${githubUser.login}`}
          >
            {githubUser.avatar_url ? (
              <img
                src={githubUser.avatar_url}
                alt={githubUser.login}
                className="w-5 h-5 rounded border border-[#007acc]/40"
              />
            ) : (
              <div className="w-5 h-5 rounded bg-[#007acc]/20 text-[#007acc] flex items-center justify-center text-[9px] font-bold">
                {githubUser.login.substring(0, 2).toUpperCase()}
              </div>
            )}
          </button>
        ) : (
          <button
            onClick={() => setAuthModalOpen(true)}
            className="flex items-center space-x-1 px-2 py-0.5 text-xs font-semibold bg-[#007acc] text-white hover:bg-[#0062a3] rounded transition-colors cursor-pointer"
          >
            <Key className="h-3 w-3" />
            <span className="hidden sm:inline">CONNECT</span>
          </button>
        )}
      </div>
    </header>
  );
}
