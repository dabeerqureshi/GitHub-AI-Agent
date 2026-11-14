"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Files,
  MessageSquare,
  GitPullRequest,
  CircleDot,
  Bot,
  ShieldCheck,
  Boxes,
  Key,
  Settings,
  Activity,
  Terminal,
} from "lucide-react";
import { useChatStore } from "@/store/use-chat-store";

interface ActivityItem {
  id: string;
  label: string;
  icon: any;
  href: string;
  badge?: number;
}

export function VSCodeActivityBar() {
  const pathname = usePathname();
  const { pendingApprovals, setAuthModalOpen, githubUser } = useChatStore();

  const topItems: ActivityItem[] = [
    { id: "explorer", label: "Explorer (Repositories & Workspace)", icon: Files, href: "/dashboard" },
    { id: "chat", label: "AI Autonomous Assistant", icon: MessageSquare, href: "/chat" },
    { id: "source-control", label: "Source Control & Pull Requests", icon: GitPullRequest, href: "/pull-requests" },
    { id: "issues", label: "Issues & Backlog", icon: CircleDot, href: "/issues" },
    { id: "agents", label: "Agent Runs & Tasks", icon: Bot, href: "/agents" },
    {
      id: "approvals",
      label: "Human-In-The-Loop Approvals",
      icon: ShieldCheck,
      href: "/approvals",
      badge: pendingApprovals.length > 0 ? pendingApprovals.length : undefined,
    },
    { id: "integrations", label: "MCP Server Integrations", icon: Boxes, href: "/integrations" },
    { id: "activity", label: "System Activity & Audit", icon: Activity, href: "/activity" },
  ];

  return (
    <aside
      className="w-12 h-screen bg-[#181818] border-r border-[#2b2b2b] flex flex-col justify-between select-none shrink-0 z-40 font-mono"
      aria-label="Activity Bar"
    >
      {/* Top Icons */}
      <div className="flex flex-col items-center py-1 space-y-0.5">
        {topItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (pathname && item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.id}
              href={item.href}
              title={item.label}
              className={`relative w-12 h-11 flex items-center justify-center transition-colors group cursor-pointer ${
                isActive
                  ? "text-white"
                  : "text-[#858585] hover:text-[#cccccc]"
              }`}
            >
              {/* VS Code 2px Active Indicator */}
              {isActive && (
                <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#007acc]" />
              )}

              <Icon className="h-5 w-5 transition-transform group-hover:scale-105" />

              {/* Approval Badge Counter */}
              {item.badge !== undefined && (
                <span className="absolute top-1.5 right-1.5 bg-[#007acc] text-white text-[9px] font-bold px-1 rounded-full min-w-[14px] text-center leading-tight">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Icons (Account & Settings) */}
      <div className="flex flex-col items-center pb-2 space-y-0.5 border-t border-[#2b2b2b]/50 pt-1">
        {/* GitHub PAT Account Button */}
        <button
          type="button"
          onClick={() => setAuthModalOpen(true)}
          title={githubUser ? `Connected as @${githubUser.login}` : "Connect GitHub PAT"}
          className="relative w-12 h-10 flex items-center justify-center text-[#858585] hover:text-[#cccccc] transition-colors cursor-pointer group"
        >
          {githubUser?.avatar_url ? (
            <img
              src={githubUser.avatar_url}
              alt={githubUser.login}
              className="w-5 h-5 rounded-full border border-[#007acc]/60 group-hover:border-[#007acc]"
            />
          ) : (
            <Key className="h-4 w-4" />
          )}
          {githubUser && (
            <span className="absolute bottom-1.5 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
        </button>

        {/* Settings Button */}
        <Link
          href="/settings/general"
          title="Settings (⌘,)"
          className={`w-12 h-10 flex items-center justify-center transition-colors cursor-pointer ${
            pathname?.startsWith("/settings")
              ? "text-white"
              : "text-[#858585] hover:text-[#cccccc]"
          }`}
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </aside>
  );
}
