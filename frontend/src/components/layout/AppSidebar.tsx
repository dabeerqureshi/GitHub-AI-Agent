"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  LayoutDashboard,
  MessageSquare,
  FolderGit2,
  CircleDot,
  GitPullRequest,
  Code2,
  Workflow,
  Bot,
  Terminal,
  CheckCircle2,
  Activity,
  Key,
  Cpu,
  Boxes,
  Settings,
  ChevronDown,
  ChevronRight,
  BookOpen,
  X,
  Sparkles,
} from "lucide-react";
import { useChatStore } from "@/store/use-chat-store";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: string | number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function AppSidebar() {
  const pathname = usePathname();
  const {
    isSidebarOpen,
    setSidebarOpen,
    activeRepo,
    githubUser,
    pendingApprovals,
    setAuthModalOpen,
  } = useChatStore();

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const pendingApprovalsCount = pendingApprovals.length;

  const navGroups: NavGroup[] = [
    {
      title: "MAIN",
      items: [
        { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
        { label: "AI Chat", href: "/chat", icon: MessageSquare },
        { label: "Repositories", href: "/repositories", icon: FolderGit2 },
        { label: "Issues", href: "/issues", icon: CircleDot },
        { label: "Pull Requests", href: "/pull-requests", icon: GitPullRequest },
      ],
    },
    {
      title: "AGENT",
      items: [
        { label: "Agent Runs", href: "/agents", icon: Bot },
        { label: "Coding Tasks", href: "/coding-tasks", icon: Terminal },
        {
          label: "Approvals",
          href: "/approvals",
          icon: CheckCircle2,
          badge: pendingApprovalsCount > 0 ? String(pendingApprovalsCount) : undefined,
        },
        { label: "Activity", href: "/activity", icon: Activity },
      ],
    },
    {
      title: "WORKSPACE",
      items: [
        { label: "Connected Accounts", href: "/settings/github", icon: Key },
        { label: "Model Settings", href: "/settings/models", icon: Cpu },
        { label: "MCP Integrations", href: "/integrations", icon: Boxes },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden animate-fade-in"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`
          ${
            isSidebarOpen
              ? "fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-[#0D1017] shadow-2xl animate-slide-up border-r border-[#252D3A]"
              : "hidden"
          }
          md:flex md:static md:flex-col md:w-64 md:bg-[#0D1017] border-r border-[#252D3A] h-screen select-none shrink-0
        `}
      >
        {/* Brand & Workspace Switcher */}
        <div className="p-3.5 border-b border-[#252D3A] flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center space-x-2.5 font-sans group truncate"
          >
            <div className="p-1.5 rounded-lg bg-indigo-500/15 text-[#818CF8] border border-indigo-500/30 group-hover:bg-indigo-500/25 transition-all shrink-0">
              <ShieldCheck className="h-5 w-5 text-[#818CF8]" />
            </div>
            <div className="flex flex-col leading-none truncate">
              <span className="text-[#F1F5F9] font-bold text-sm tracking-tight truncate">
                GitHub AI
              </span>
              <span className="text-[10px] text-[#64748B] font-mono mt-0.5 tracking-wider uppercase truncate">
                Workspace
              </span>
            </div>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-md text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#171E2B] md:hidden transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {navGroups.map((group) => {
            const isCollapsed = collapsedGroups[group.title];
            return (
              <div key={group.title} className="space-y-0.5">
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-mono font-semibold text-[#64748B] hover:text-[#94A3B8] uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <span>{group.title}</span>
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>

                {!isCollapsed &&
                  group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          if (isSidebarOpen) setSidebarOpen(false);
                        }}
                        className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                          isActive
                            ? "bg-[#171E2B] text-[#F1F5F9] font-semibold border-l-2 border-[#818CF8]"
                            : "text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#121722]"
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 truncate">
                          <Icon
                            className={`h-4 w-4 shrink-0 transition-colors ${
                              isActive
                                ? "text-[#818CF8]"
                                : "text-[#64748B] group-hover:text-[#94A3B8]"
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
              </div>
            );
          })}
        </div>

        {/* Bottom Section: Documentation, Settings & Profile */}
        <div className="p-2 border-t border-[#252D3A] bg-[#090B10]/40 space-y-0.5">
          <Link
            href="/settings/general"
            className="flex items-center space-x-2.5 px-2.5 py-1.5 rounded-md text-xs text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#121722] transition-colors"
          >
            <Settings className="h-4 w-4 text-[#64748B]" />
            <span>Settings</span>
          </Link>

          {/* User Profile */}
          <div className="pt-1.5 border-t border-[#252D3A]/60 flex items-center justify-between px-2.5 py-1">
            {githubUser ? (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center space-x-2 truncate hover:opacity-90 transition-opacity text-left w-full cursor-pointer"
              >
                {githubUser.avatar_url ? (
                  <img
                    src={githubUser.avatar_url}
                    alt={githubUser.login}
                    className="w-5 h-5 rounded-full border border-indigo-500/40 shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#818CF8]/20 text-[#818CF8] flex items-center justify-center text-[10px] font-bold shrink-0">
                    {githubUser.login.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="truncate">
                  <div className="text-xs font-mono font-medium text-[#F1F5F9] truncate leading-none">
                    @{githubUser.login}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>PAT Active</span>
                  </div>
                </div>
              </button>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="w-full flex items-center justify-center space-x-1.5 px-2 py-1 text-xs font-medium bg-[#171E2B] hover:bg-[#121722] text-[#818CF8] border border-indigo-500/30 rounded-md transition-colors cursor-pointer"
              >
                <Key className="h-3 w-3" />
                <span>Connect GitHub</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
