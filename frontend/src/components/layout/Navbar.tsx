"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  Database,
  Key,
  Sparkles,
  ChevronDown,
  Menu,
} from "lucide-react";
import { fetchHealth } from "@/lib/api";
import { useChatStore } from "@/store/use-chat-store";
import { RepoCombobox } from "@/components/layout/RepoCombobox";
import { GitHubAuthModal } from "@/components/auth/GitHubAuthModal";
import { ModelSelectorModal } from "@/components/models/ModelSelectorModal";

export function Navbar() {
  const pathname = usePathname();
  const {
    githubUser,
    setAuthModalOpen,
    loadAuthStatus,
    loadRepositories,
    activeProvider,
    activeModel,
    setModelModalOpen,
    loadModelsConfig,
    toggleSidebar,
  } = useChatStore();

  const [health, setHealth] = useState<{ status: string; default_provider: string } | null>(null);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: "offline", default_provider: "ollama" }));

    loadAuthStatus();
    loadRepositories();
    loadModelsConfig();
  }, [loadAuthStatus, loadRepositories, loadModelsConfig]);

  const navLinks = [
    { href: "/", label: "Workspace" },
    { href: "/approvals", label: "Approvals" },
    { href: "/runs", label: "Runs & Timeline" },
    { href: "/audit", label: "Audit Log" },
  ];

  return (
    <>
      <header className="glass-panel px-3 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-40 border-b border-border shadow-lg">
        {/* Left Section: Mobile Menu + Brand & Repo Selector */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary md:hidden transition-colors cursor-pointer"
            aria-label="Toggle sessions sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            href="/"
            className="flex items-center space-x-2.5 font-mono font-bold text-base tracking-tight group"
          >
            <div className="p-1.5 rounded-xl bg-primary/15 text-primary border border-primary/30 group-hover:bg-primary/25 transition-all shrink-0 shadow-inner">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col leading-tight hidden sm:flex">
              <span className="text-foreground font-semibold text-sm tracking-tight whitespace-nowrap">GitHub AI Workspace</span>
              <span className="text-[10px] text-muted-foreground font-mono font-normal tracking-wide whitespace-nowrap uppercase">
                Enterprise Autonomous Agent
              </span>
            </div>
          </Link>

          {/* Dynamic Repository Combobox */}
          <RepoCombobox />
        </div>

        {/* Right Section: Badges, Nav & User */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Status Badges */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs">
            {/* Clickable AI Engine Model Provider Selector */}
            <button
              type="button"
              onClick={() => setModelModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full border border-border bg-secondary/80 hover:bg-secondary font-mono text-[11px] shadow-xs transition-all cursor-pointer interactive-card group"
              title="Change LLM Provider & API Key"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-400 group-hover:rotate-12 transition-transform" />
              <span className="text-muted-foreground hidden sm:inline mr-0.5">Engine:</span>
              <span className="capitalize font-semibold text-foreground">
                {activeProvider || health?.default_provider || "Gemini"}
              </span>
              {activeModel && (
                <span className="text-[10px] text-muted-foreground font-normal truncate max-w-[90px] sm:max-w-[120px] ml-0.5 hidden md:inline font-tabular">
                  ({activeModel.split("/").pop()})
                </span>
              )}
              <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors ml-0.5" />
            </button>

            {/* Backend Health Status */}
            <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-full border border-border bg-secondary/80 font-mono text-[11px] shadow-xs">
              <Database className="h-3.5 w-3.5 text-emerald-400" />
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
          </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center space-x-1 text-xs font-medium bg-secondary/60 p-1 rounded-xl border border-border">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    isActive
                      ? "bg-card text-foreground shadow-sm font-semibold border border-border text-white"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* GitHub Profile / Connect Button */}
          {githubUser ? (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center space-x-1.5 sm:space-x-2 pl-1.5 pr-2.5 sm:pr-3 py-1 rounded-xl border border-border bg-secondary/80 hover:bg-secondary transition-all cursor-pointer interactive-card"
            >
              {githubUser.avatar_url ? (
                <img
                  src={githubUser.avatar_url}
                  alt={githubUser.login}
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-primary/40"
                />
              ) : (
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                  {githubUser.login.substring(0, 2).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-mono font-medium text-foreground hidden sm:inline">
                @{githubUser.login}
              </span>
            </button>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-white hover:bg-primary/90 border border-primary/40 rounded-xl transition-all cursor-pointer shadow-sm shadow-primary/25"
            >
              <Key className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Connect GitHub</span>
            </button>
          )}
        </div>
      </header>

      {/* Modals */}
      <GitHubAuthModal />
      <ModelSelectorModal />
    </>
  );
}
