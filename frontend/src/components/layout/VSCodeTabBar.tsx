"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  X,
  FileCode,
  FileJson,
  FileCheck2,
  Terminal,
  FolderGit2,
  ChevronRight,
  SplitSquareVertical,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import { useChatStore } from "@/store/use-chat-store";
import { RepoCombobox } from "@/components/layout/RepoCombobox";

interface EditorTab {
  label: string;
  href: string;
  icon: any;
  iconColor?: string;
  badge?: number;
}

function useSafeRouter() {
  try {
    return useRouter();
  } catch {
    return null;
  }
}

export function VSCodeTabBar() {
  const pathname = usePathname();
  const router = useSafeRouter();
  const { activeRepo, pendingApprovals } = useChatStore();

  const tabs: EditorTab[] = [
    { label: "ai-chat.tsx", href: "/chat", icon: Sparkles, iconColor: "text-amber-400" },
    { label: "overview.json", href: "/dashboard", icon: FileJson, iconColor: "text-blue-400" },
    {
      label: "approvals.diff",
      href: "/approvals",
      icon: FileCheck2,
      iconColor: "text-emerald-400",
      badge: pendingApprovals.length > 0 ? pendingApprovals.length : undefined,
    },
    { label: "runs.log", href: "/runs", icon: Terminal, iconColor: "text-purple-400" },
    { label: "repositories.ts", href: "/repositories", icon: FileCode, iconColor: "text-cyan-400" },
  ];

  const currentTab = tabs.find((t) => t.href === pathname) || {
    label: `${(pathname?.split("/").pop() || "workspace")}.ts`,
    href: pathname || "/",
    icon: FileCode,
    iconColor: "text-cyan-400",
  };

  return (
    <div className="bg-[#252526] border-b border-[#2b2b2b] select-none font-mono text-xs">
      {/* Editor Tab Strip */}
      <div className="flex items-center justify-between overflow-x-auto h-9 bg-[#252526]">
        {/* Left: Tab List */}
        <div className="flex items-center h-full">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`group flex items-center space-x-2 px-3 h-full border-r border-[#2b2b2b] text-xs transition-colors cursor-pointer relative ${
                  isActive
                    ? "bg-[#1e1e1e] text-[#ffffff] font-medium"
                    : "bg-[#252526] text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e]"
                }`}
              >
                {/* VS Code Top Active Tab Accent */}
                {isActive && (
                  <span className="absolute top-0 left-0 right-0 h-[2px] bg-[#007acc]" />
                )}

                <Icon className={`h-3.5 w-3.5 ${tab.iconColor || "text-[#007acc]"}`} />
                <span className="truncate max-w-[120px]">{tab.label}</span>

                {tab.badge !== undefined && (
                  <span className="bg-[#007acc] text-white text-[9px] font-bold px-1 rounded-full">
                    {tab.badge}
                  </span>
                )}

                {/* Close Tab Icon */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (router?.push) {
                      router.push("/dashboard");
                    } else if (typeof window !== "undefined") {
                      window.location.href = "/dashboard";
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:bg-[#3c3c3c] p-0.5 rounded transition-opacity"
                  title="Close Tab"
                >
                  <X className="h-3 w-3 text-[#858585] hover:text-white" />
                </button>
              </Link>
            );
          })}
        </div>

        {/* Right Controls: Repo Combobox & Utility Controls */}
        <div className="flex items-center space-x-2 px-2 shrink-0">
          <RepoCombobox />
          <button
            type="button"
            className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#2a2d2e] transition-colors"
            title="Split Editor Right"
          >
            <SplitSquareVertical className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#2a2d2e] transition-colors"
            title="More Actions..."
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* VS Code Breadcrumb Bar */}
      <div className="flex items-center space-x-1 px-4 py-1 bg-[#1e1e1e] border-b border-[#2b2b2b] text-[11px] text-[#858585]">
        <FolderGit2 className="h-3 w-3 text-[#007acc] shrink-0" />
        <span className="hover:text-[#cccccc] cursor-pointer">github-ai-workspace</span>
        <ChevronRight className="h-2.5 w-2.5 text-[#555555] shrink-0" />
        <span className="text-[#cccccc] font-medium hover:underline cursor-pointer truncate max-w-[200px]">
          {activeRepo || "global"}
        </span>
        <ChevronRight className="h-2.5 w-2.5 text-[#555555] shrink-0" />
        <span className="text-[#ffffff] font-medium">{currentTab.label}</span>
      </div>
    </div>
  );
}
