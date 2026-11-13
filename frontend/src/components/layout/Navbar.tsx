"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  Cpu,
  Database,
  CheckCircle2,
  AlertCircle,
  Key,
  Github,
  Sparkles,
} from "lucide-react";
import { fetchHealth } from "@/lib/api";
import { useChatStore } from "@/store/use-chat-store";
import { RepoCombobox } from "@/components/layout/RepoCombobox";
import { GitHubAuthModal } from "@/components/auth/GitHubAuthModal";

export function Navbar() {
  const pathname = usePathname();
  const {
    githubUser,
    setAuthModalOpen,
    loadAuthStatus,
    loadRepositories,
  } = useChatStore();

  const [health, setHealth] = useState<{ status: string; default_provider: string } | null>(null);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: "offline", default_provider: "ollama" }));

    loadAuthStatus();
    loadRepositories();
  }, [loadAuthStatus, loadRepositories]);

  const navLinks = [
    { href: "/", label: "Workspace" },
    { href: "/approvals", label: "Approvals" },
    { href: "/runs", label: "Runs & Timeline" },
    { href: "/audit", label: "Audit Log" },
  ];

  return (
    <>
      <header className="glass-panel px-6 py-2.5 flex items-center justify-between sticky top-0 z-40 border-b border-border/80 shadow-md">
        {/* Left Section: Brand & Repo Selector */}
        <div className="flex items-center space-x-6">
          <Link
            href="/"
            className="flex items-center space-x-2.5 font-mono font-bold text-base tracking-tight group"
          >
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary/20 transition-all">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-foreground font-semibold text-sm">GitHub AI Workspace</span>
              <span className="text-[10px] text-muted-foreground font-mono font-normal">
                Enterprise Autonomous Agent
              </span>
            </div>
          </Link>

          {/* Dynamic Repository Combobox */}
          <RepoCombobox />
        </div>

        {/* Right Section: Badges, Nav & User */}
        <div className="flex items-center space-x-4">
          {/* Status Badges */}
          <div className="hidden md:flex items-center space-x-2 text-xs">
            {/* AI Engine Model Provider */}
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full border border-border/80 bg-secondary/50 font-mono text-[11px] shadow-sm">
              <Sparkles className="h-3 w-3 text-indigo-400 animate-pulse" />
              <span className="text-muted-foreground">Engine:</span>
              <span className="capitalize font-semibold text-foreground">
                {health?.default_provider || "Gemini / Ollama"}
              </span>
            </div>

            {/* Backend Health Status */}
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full border border-border/80 bg-secondary/50 font-mono text-[11px] shadow-sm">
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
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 text-xs font-medium bg-secondary/40 p-1 rounded-xl border border-border/60">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    isActive
                      ? "bg-background text-foreground shadow-sm font-semibold border border-border/60"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
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
              className="flex items-center space-x-2 pl-1.5 pr-3 py-1 rounded-xl border border-border/80 bg-secondary/60 hover:bg-secondary transition-all cursor-pointer glow-hover"
            >
              {githubUser.avatar_url ? (
                <img
                  src={githubUser.avatar_url}
                  alt={githubUser.login}
                  className="w-6 h-6 rounded-full border border-primary/30"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                  {githubUser.login.substring(0, 2).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-mono font-medium text-foreground">
                @{githubUser.login}
              </span>
            </button>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 rounded-xl transition-all cursor-pointer glow-hover shadow-sm"
            >
              <Key className="h-3.5 w-3.5" />
              <span>Connect GitHub</span>
            </button>
          )}
        </div>
      </header>

      {/* Auth Modal Component */}
      <GitHubAuthModal />
    </>
  );
}
