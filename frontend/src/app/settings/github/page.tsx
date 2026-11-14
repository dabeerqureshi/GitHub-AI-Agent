"use client";

import React, { useState } from "react";
import {
  Key,
  ShieldCheck,
  CheckCircle2,
  FolderGit2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useChatStore } from "@/store/use-chat-store";
import { refreshRepositories } from "@/lib/api";

export default function GitHubSettingsPage() {
  const {
    githubUser,
    repositories,
    setAuthModalOpen,
    loadRepositories,
  } = useChatStore();

  const [refreshing, setRefreshing] = useState(false);

  const handleSync = async () => {
    setRefreshing(true);
    try {
      await refreshRepositories();
      await loadRepositories();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Page Header */}
        <div className="pb-4 border-b border-[#2b2b2b]">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#ffffff] flex items-center gap-2">
            <Key className="h-6 w-6 text-[#007acc]" />
            <span>Connected GitHub Account</span>
          </h1>
          <p className="text-xs text-[#8c8c8c] mt-0.5">
            Manage your GitHub Personal Access Token (PAT), organization discovery, and repository permissions.
          </p>
        </div>

        {/* Identity Card */}
        <div className="p-5 rounded-md bg-[#252526] border border-[#2b2b2b] space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3.5">
              {githubUser?.avatar_url ? (
                <img
                  src={githubUser.avatar_url}
                  alt={githubUser.login}
                  className="w-12 h-12 rounded-md border border-indigo-500/40"
                />
              ) : (
                <div className="w-12 h-12 rounded-md bg-indigo-500/20 text-[#007acc] flex items-center justify-center text-lg font-bold">
                  GH
                </div>
              )}
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-[#ffffff]">
                    {githubUser?.name || githubUser?.login || "Connected GitHub Account"}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Active PAT
                  </span>
                </div>
                <div className="text-xs text-[#8c8c8c] font-mono mt-0.5">
                  @{githubUser?.login || "dabeerqureshi"}
                </div>
              </div>
            </div>

            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-[#252526] hover:bg-[#2a2d2e] border border-[#2b2b2b] text-[#ffffff] transition-colors cursor-pointer"
            >
              Update Token
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#2b2b2b] text-xs">
            <div className="p-3 rounded-lg bg-[#1e1e1e] border border-[#2b2b2b]">
              <div className="text-[#8c8c8c] text-[11px] font-mono uppercase">Repositories</div>
              <div className="text-lg font-bold text-[#ffffff] mt-0.5 font-tabular">
                {repositories.length}
              </div>
              <div className="text-[10px] text-[#8c8c8c]">Auto-discovered</div>
            </div>

            <div className="p-3 rounded-lg bg-[#1e1e1e] border border-[#2b2b2b]">
              <div className="text-[#8c8c8c] text-[11px] font-mono uppercase">Token Scopes</div>
              <div className="text-xs font-mono font-medium text-emerald-400 mt-1">
                repo, read:org, workflow
              </div>
              <div className="text-[10px] text-[#8c8c8c]">Fine-grained access</div>
            </div>

            <div className="p-3 rounded-lg bg-[#1e1e1e] border border-[#2b2b2b]">
              <div className="text-[#8c8c8c] text-[11px] font-mono uppercase">HITL Security</div>
              <div className="text-xs font-mono font-medium text-[#007acc] mt-1">
                HMAC SHA-256 Gated
              </div>
              <div className="text-[10px] text-[#8c8c8c]">Write confirmation enforced</div>
            </div>
          </div>
        </div>

        {/* Sync Repositories Action */}
        <div className="p-5 rounded-md bg-[#252526] border border-[#2b2b2b] flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-[#ffffff]">Re-synchronize Repositories</h4>
            <p className="text-xs text-[#8c8c8c] mt-0.5">
              Query GitHub API to detect any recently created, forked, or invited repositories.
            </p>
          </div>

          <button
            onClick={handleSync}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md bg-[#007acc] hover:bg-[#007acc]/90 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            <span>Sync Now</span>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
