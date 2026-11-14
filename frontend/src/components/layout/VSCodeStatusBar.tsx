"use client";

import React, { useEffect, useState } from "react";
import {
  GitBranch,
  RefreshCw,
  XCircle,
  AlertTriangle,
  Zap,
  Shield,
  Bell,
  Check,
} from "lucide-react";
import { useChatStore } from "@/store/use-chat-store";
import { fetchHealth } from "@/lib/api";

export function VSCodeStatusBar() {
  const {
    activeRepo,
    repositories,
    activeProvider,
    activeModel,
    setModelModalOpen,
  } = useChatStore();

  const [health, setHealth] = useState<{ status: string } | null>(null);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: "offline" }));
  }, []);

  const selectedRepo = repositories.find((r) => r.full_name === activeRepo);
  const currentBranch = selectedRepo?.default_branch || "main";

  return (
    <footer
      className="h-[22px] bg-[#007acc] text-white flex items-center justify-between px-2 text-[11px] font-mono select-none shrink-0 z-40"
      aria-label="Status Bar"
    >
      {/* Left: Git Branch, Sync, Diagnostics */}
      <div className="flex items-center space-x-3">
        {/* Branch */}
        <button
          type="button"
          className="flex items-center space-x-1 hover:bg-[#0e639c] px-1.5 py-0.5 rounded transition-colors cursor-pointer"
          title={`Active Branch: ${currentBranch}`}
        >
          <GitBranch className="h-3 w-3" />
          <span>{currentBranch}*</span>
        </button>

        {/* Sync Status */}
        <button
          type="button"
          className="flex items-center space-x-1 hover:bg-[#0e639c] px-1.5 py-0.5 rounded transition-colors cursor-pointer"
          title="Synchronize Changes"
        >
          <RefreshCw className="h-2.5 w-2.5" />
          <span>0 ↓ 0 ↑</span>
        </button>

        {/* Error / Warning count */}
        <div className="flex items-center space-x-2 text-[10px]">
          <span className="flex items-center space-x-0.5" title="0 Errors">
            <XCircle className="h-2.5 w-2.5" />
            <span>0</span>
          </span>
          <span className="flex items-center space-x-0.5" title="0 Warnings">
            <AlertTriangle className="h-2.5 w-2.5" />
            <span>0</span>
          </span>
        </div>
      </div>

      {/* Center / Right: Engine & Security */}
      <div className="flex items-center space-x-3">
        {/* AI Engine & Model Modal Trigger */}
        <button
          type="button"
          onClick={() => setModelModalOpen(true)}
          className="flex items-center space-x-1 hover:bg-[#0e639c] px-1.5 py-0.5 rounded transition-colors cursor-pointer font-medium"
          title="Click to configure AI engine & models"
        >
          <Zap className="h-3 w-3 text-amber-200" />
          <span>{activeModel || "gemini-3.8-flash"}</span>
        </button>

        {/* Cryptographic HITL */}
        <div className="hidden sm:flex items-center space-x-1" title="Human-In-The-Loop Cryptographic Verification">
          <Shield className="h-2.5 w-2.5 text-emerald-200" />
          <span>HITL Enforced</span>
        </div>

        {/* Text Encoding & File Format */}
        <span className="hidden md:inline hover:bg-[#0e639c] px-1.5 py-0.5 rounded cursor-pointer">
          UTF-8
        </span>

        <span className="hidden md:inline hover:bg-[#0e639c] px-1.5 py-0.5 rounded cursor-pointer">
          LF
        </span>

        {/* Online Status */}
        <div className="flex items-center space-x-1 hover:bg-[#0e639c] px-1.5 py-0.5 rounded cursor-pointer">
          <Check className="h-3 w-3 text-emerald-200" />
          <span>AI Agent Ready</span>
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          className="hover:bg-[#0e639c] p-0.5 rounded transition-colors cursor-pointer"
          title="Notifications"
        >
          <Bell className="h-3 w-3" />
        </button>
      </div>
    </footer>
  );
}
