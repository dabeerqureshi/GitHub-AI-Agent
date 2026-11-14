"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  Database,
  Key,
  Menu,
  X,
  LayoutDashboard,
  MessageSquare,
  FileCheck2,
  GitFork,
  FileText,
  FolderGit2,
} from "lucide-react";
import { fetchHealth } from "@/lib/api";
import { useChatStore } from "@/store/use-chat-store";
import { RepoCombobox } from "@/components/layout/RepoCombobox";
import { ModelDropdown } from "@/components/models/ModelDropdown";
import { GitHubAuthModal } from "@/components/auth/GitHubAuthModal";
import { ModelSelectorModal } from "@/components/models/ModelSelectorModal";

export function Navbar() {
  const pathname = usePathname();
  const {
    githubUser,
    setAuthModalOpen,
    loadAuthStatus,
    loadRepositories,
    loadModelsConfig,
    pendingApprovals,
    toggleSidebar,
  } = useChatStore();

  const [health, setHealth] = useState<{ status: string; default_provider: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: "offline", default_provider: "gemini" }));

    loadAuthStatus();
    loadRepositories();
    loadModelsConfig();
  }, [loadAuthStatus, loadRepositories, loadModelsConfig]);

  const navLinks = [
    { href: "/", label: "Workspace", icon: MessageSquare },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    {
      href: "/approvals",
      label: "Approvals",
      icon: FileCheck2,
      badge: pendingApprovals.length > 0 ? pendingApprovals.length : undefined,
    },
    { href: "/runs", label: "Runs & Timeline", icon: GitFork },
    { href: "/repositories", label: "Repositories", icon: FolderGit2 },
    { href: "/audit", label: "Audit Log", icon: FileText },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950">
        {/* TIER 1: Brand Logo, Repository Switcher, Model Dropdown & Account Controls */}
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 h-13 flex items-center justify-between gap-3">
          {/* Left: Mobile Toggle, Brand & Repository Selector */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
                toggleSidebar();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 md:hidden transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Brand Logo & Name */}
            <Link
              href="/"
              className="flex items-center space-x-2.5 font-sans font-bold text-sm sm:text-base tracking-tight shrink-0 group"
            >
              <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 group-hover:bg-indigo-500/25 transition-all shrink-0">
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="flex flex-col leading-tight hidden sm:flex">
                <span className="text-white font-semibold text-sm tracking-tight whitespace-nowrap">
                  GitHub AI Workspace
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-normal tracking-wide whitespace-nowrap uppercase">
                  Enterprise Autonomous Agent
                </span>
              </div>
            </Link>

            {/* Repository Selector Combobox */}
            <div className="shrink min-w-0">
              <RepoCombobox />
            </div>
          </div>

          {/* Right: Model Dropdown, Status & User Controls */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
            {/* Provider & Model Selector Dropdown */}
            <ModelDropdown align="right" direction="down" />

            {/* Backend API Health Status */}
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 font-mono text-[11px]">
              <Database className="h-3 w-3 text-emerald-400 shrink-0" />
              {health?.status === "ok" ? (
                <span className="text-emerald-400 font-medium flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                  Online
                </span>
              ) : (
                <span className="text-amber-400 font-medium">Offline</span>
              )}
            </div>

            {/* GitHub Profile / Connect Button */}
            {githubUser ? (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center space-x-1.5 pl-1.5 pr-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 transition-all cursor-pointer"
                title={`Connected as @${githubUser.login}`}
              >
                {githubUser.avatar_url ? (
                  <img
                    src={githubUser.avatar_url}
                    alt={githubUser.login}
                    className="w-5 h-5 rounded-full border border-indigo-400/50"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                    {githubUser.login.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-mono font-medium text-slate-200 hidden md:inline truncate max-w-[100px]">
                  @{githubUser.login}
                </span>
              </button>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all cursor-pointer shadow-sm"
              >
                <Key className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Connect PAT</span>
              </button>
            )}
          </div>
        </div>

        {/* TIER 2: Clean Sub-Navigation Tab Strip (Zero Text Collision at Any Resolution) */}
        <div className="w-full border-t border-slate-800 bg-slate-950">
          <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 flex items-center space-x-1 sm:space-x-2 overflow-x-auto scrollbar-none h-9.5 text-xs font-medium">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/" || pathname === "/chat"
                  : Boolean(pathname?.startsWith(link.href)) ||
                    (link.href === "/runs" && pathname === "/agents");
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-t-md transition-all shrink-0 whitespace-nowrap ${
                    isActive
                      ? "text-indigo-400 font-semibold border-b-2 border-indigo-500 bg-indigo-500/10"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/60"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="ml-1 px-1.5 py-0.2 text-[9px] rounded-full bg-amber-500 text-slate-950 font-bold font-mono">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-3 space-y-2 animate-slide-up">
            <div className="grid grid-cols-2 gap-1.5">
              {navLinks.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/" || pathname === "/chat"
                    : Boolean(pathname?.startsWith(link.href)) ||
                      (link.href === "/runs" && pathname === "/agents");
                const Icon = link.icon;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-indigo-600 text-white font-semibold"
                        : "text-slate-300 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{link.label}</span>
                    {link.badge && (
                      <span className="ml-auto px-1.5 py-0.2 text-[9px] rounded-full bg-amber-500 text-slate-950 font-bold font-mono">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Global Modals */}
      <GitHubAuthModal />
      <ModelSelectorModal />
    </>
  );
}
