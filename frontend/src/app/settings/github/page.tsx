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
        <div className="pb-4 border-b border-[#252D3A]">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
            <Key className="h-6 w-6 text-[#818CF8]" />
            <span>Connected GitHub Account</span>
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Manage your GitHub Personal Access Token (PAT), organization discovery, and repository permissions.
          </p>
        </div>

        {/* Identity Card */}
        <div className="p-5 rounded-xl surface-card border border-[#252D3A] space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3.5">
              {githubUser?.avatar_url ? (
                <img
                  src={githubUser.avatar_url}
                  alt={githubUser.login}
                  className="w-12 h-12 rounded-xl border border-indigo-500/40"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-[#818CF8] flex items-center justify-center text-lg font-bold">
                  GH
                </div>
              )}
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-[#F1F5F9]">
                    {githubUser?.name || githubUser?.login || "Connected GitHub Account"}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Active PAT
                  </span>
                </div>
                <div className="text-xs text-[#94A3B8] font-mono mt-0.5">
                  @{githubUser?.login || "dabeerqureshi"}
                </div>
              </div>
            </div>

            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-[#121722] hover:bg-[#171E2B] border border-[#252D3A] text-[#F1F5F9] transition-colors cursor-pointer"
            >
              Update Token
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#252D3A] text-xs">
            <div className="p-3 rounded-lg bg-[#0D1017] border border-[#252D3A]">
              <div className="text-[#64748B] text-[11px] font-mono uppercase">Repositories</div>
              <div className="text-lg font-bold text-[#F1F5F9] mt-0.5 font-tabular">
                {repositories.length}
              </div>
              <div className="text-[10px] text-[#94A3B8]">Auto-discovered</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0D1017] border border-[#252D3A]">
              <div className="text-[#64748B] text-[11px] font-mono uppercase">Token Scopes</div>
              <div className="text-xs font-mono font-medium text-emerald-400 mt-1">
                repo, read:org, workflow
              </div>
              <div className="text-[10px] text-[#94A3B8]">Fine-grained access</div>
            </div>

            <div className="p-3 rounded-lg bg-[#0D1017] border border-[#252D3A]">
              <div className="text-[#64748B] text-[11px] font-mono uppercase">HITL Security</div>
              <div className="text-xs font-mono font-medium text-[#818CF8] mt-1">
                HMAC SHA-256 Gated
              </div>
              <div className="text-[10px] text-[#94A3B8]">Write confirmation enforced</div>
            </div>
          </div>
        </div>

        {/* Sync Repositories Action */}
        <div className="p-5 rounded-xl surface-card border border-[#252D3A] flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-[#F1F5F9]">Re-synchronize Repositories</h4>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Query GitHub API to detect any recently created, forked, or invited repositories.
            </p>
          </div>

          <button
            onClick={handleSync}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md bg-[#818CF8] hover:bg-[#818CF8]/90 text-[#090B10] text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            <span>Sync Now</span>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
