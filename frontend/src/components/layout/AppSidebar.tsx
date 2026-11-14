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
  Terminal,
  CheckCircle2,
  Activity,
  Key,
  Cpu,
  Boxes,
  Settings,
  ChevronDown,
  ChevronRight,
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
        { label: "Agent Runs", href: "/agents", icon: Terminal },
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
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-xs md:hidden animate-fade-in"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`
          ${
            isSidebarOpen
              ? "fixed inset-y-0 left-12 z-50 flex flex-col w-60 bg-[#252526] shadow-2xl animate-slide-up border-r border-[#2b2b2b]"
              : "hidden"
          }
          md:flex md:static md:flex-col md:w-60 md:bg-[#252526] border-r border-[#2b2b2b] h-screen select-none shrink-0
        `}
      >
        {/* VS Code Explorer Title Header */}
        <div className="h-9 px-3 border-b border-[#2b2b2b] flex items-center justify-between bg-[#252526] text-[#bbbbbb] font-mono">
          <span className="text-[11px] font-bold uppercase tracking-wider truncate">
            Explorer: GitHub AI
          </span>

          <div className="flex items-center space-x-1">
            <Link
              href="/chat"
              title="New AI Chat Session"
              className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#333333] transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#007acc]" />
            </Link>

            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#333333] md:hidden transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Navigation Groups (Tree View) */}
        <div className="flex-1 overflow-y-auto px-1 py-1.5 space-y-2">
          {navGroups.map((group) => {
            const isCollapsed = collapsedGroups[group.title];
            return (
              <div key={group.title} className="space-y-0.5">
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center space-x-1 px-1.5 py-1 text-[11px] font-mono font-bold text-[#bbbbbb] hover:text-white transition-colors cursor-pointer select-none"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 text-[#858585] shrink-0" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-[#858585] shrink-0" />
                  )}
                  <span className="uppercase tracking-wide truncate">{group.title}</span>
                </button>

                {!isCollapsed && (
                  <div className="space-y-0.5 pl-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        pathname === item.href ||
                        Boolean(pathname && item.href !== "/dashboard" && pathname.startsWith(item.href));
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            if (isSidebarOpen) setSidebarOpen(false);
                          }}
                          className={`group flex items-center justify-between px-2 py-1 rounded text-[12px] font-mono transition-colors ${
                            isActive
                              ? "bg-[#37373d] text-white font-medium"
                              : "text-[#cccccc] hover:text-white hover:bg-[#2a2d2e]"
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <Icon
                              className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                                isActive
                                  ? "text-[#007acc]"
                                  : "text-[#858585] group-hover:text-[#cccccc]"
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>

                          {item.badge && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#007acc] text-white font-bold">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Section: User Profile Pill */}
        <div className="p-2 border-t border-[#2b2b2b] bg-[#1e1e1e]/60">
          {githubUser ? (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center space-x-2 p-1.5 rounded hover:bg-[#2a2d2e] transition-colors text-left w-full cursor-pointer"
            >
              {githubUser.avatar_url ? (
                <img
                  src={githubUser.avatar_url}
                  alt={githubUser.login}
                  className="w-5 h-5 rounded border border-[#007acc]/60 shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded bg-[#007acc]/20 text-[#007acc] flex items-center justify-center text-[10px] font-bold font-mono shrink-0">
                  {githubUser.login.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="truncate flex-1">
                <div className="text-[11px] font-mono font-medium text-white truncate leading-none">
                  @{githubUser.login}
                </div>
                <div className="text-[9px] text-[#007acc] font-mono mt-0.5 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>CONNECTED</span>
                </div>
              </div>
            </button>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full flex items-center justify-center space-x-1.5 px-2 py-1 text-xs font-mono font-medium bg-[#007acc] hover:bg-[#0e639c] text-white rounded transition-colors cursor-pointer"
            >
              <Key className="h-3 w-3" />
              <span>Connect GitHub</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
