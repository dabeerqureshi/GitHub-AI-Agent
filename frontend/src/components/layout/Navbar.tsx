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
    const checkHealth = () => {
      fetchHealth()
        .then(setHealth)
        .catch(() => setHealth({ status: "offline", default_provider: "gemini" }));
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);

    loadAuthStatus();
    loadRepositories();
    loadModelsConfig();

    return () => clearInterval(interval);
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
      <header className="sticky top-0 z-40 w-full border-b border-[#333333] bg-[#1f1f1f]">
        {/* TIER 1: Brand Logo, Repository Switcher, Model Dropdown & Account Controls */}
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* Left: Mobile Toggle, Brand & Repository Selector */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
                toggleSidebar();
              }}
              className="p-1.5 rounded-md text-[#cccccc] hover:text-white hover:bg-[#2a2d2e] md:hidden transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Brand Logo & Name */}
            <Link
              href="/"
              className="flex items-center space-x-2.5 font-sans font-bold text-sm sm:text-base tracking-tight shrink-0 group"
            >
              <div className="p-1.5 rounded-md bg-[#007acc]/15 text-[#3794ff] border border-[#007acc]/30 group-hover:bg-[#007acc]/25 transition-all shrink-0">
                <ShieldCheck className="h-5 w-5 text-[#3794ff]" />
              </div>
              <div className="flex flex-col leading-tight hidden sm:flex">
                <span className="text-white font-semibold text-sm tracking-tight whitespace-nowrap">
                  GitHub AI Workspace
                </span>
                <span className="text-[10px] text-[#858585] font-mono font-normal tracking-wide whitespace-nowrap uppercase">
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
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-md border border-[#333333] bg-[#252526] font-mono text-[11px]">
              <Database className="h-3 w-3 text-[#73c991] shrink-0" />
              {health?.status === "ok" ? (
                <span className="text-[#73c991] font-medium flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#73c991] mr-1 animate-pulse" />
                  Online
                </span>
              ) : (
                <span className="text-[#cca700] font-medium">Offline</span>
              )}
            </div>

            {/* GitHub Profile / Connect Button */}
            {githubUser ? (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center space-x-1.5 pl-1.5 pr-2.5 py-1 rounded-md border border-[#333333] bg-[#252526] hover:bg-[#2a2d2e] transition-all cursor-pointer text-[#cccccc] hover:text-white"
                title={`Connected as @${githubUser.login}`}
              >
                {githubUser.avatar_url ? (
                  <img
                    src={githubUser.avatar_url}
                    alt={githubUser.login}
                    className="w-5 h-5 rounded-full border border-[#007acc]/60"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#007acc]/20 text-[#3794ff] flex items-center justify-center text-[10px] font-bold">
                    {githubUser.login.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-mono font-medium text-[#cccccc] hidden md:inline truncate max-w-[100px]">
                  @{githubUser.login}
                </span>
              </button>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold bg-[#007acc] hover:bg-[#0e639c] text-white rounded-md transition-all cursor-pointer shadow-sm"
              >
                <Key className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Connect PAT</span>
              </button>
            )}
          </div>
        </div>

        {/* TIER 2: Clean Sub-Navigation Tab Strip (VS Code Editor Tabs Style) */}
        <div className="w-full border-t border-[#333333] bg-[#181818]">
          <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 flex items-center space-x-1 overflow-x-auto scrollbar-none h-9 text-xs font-medium">
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
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 transition-all shrink-0 whitespace-nowrap rounded-t-sm border-t-2 ${
                    isActive
                      ? "text-white font-medium border-t-[#007acc] bg-[#1e1e1e] border-x border-[#333333]"
                      : "text-[#969696] hover:text-white hover:bg-[#2a2d2e]/50 border-t-transparent border-x border-transparent"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[#3794ff]" : "text-[#858585]"}`} />
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="ml-1 px-1.5 py-0.2 text-[9px] rounded-full bg-[#cca700] text-[#181818] font-bold font-mono">
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
          <div className="md:hidden border-t border-[#333333] bg-[#1f1f1f] px-4 py-3 space-y-2 animate-slide-up">
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
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-[#007acc] text-white font-medium"
                        : "text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{link.label}</span>
                    {link.badge && (
                      <span className="ml-auto px-1.5 py-0.2 text-[9px] rounded-full bg-[#cca700] text-[#181818] font-bold font-mono">
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
