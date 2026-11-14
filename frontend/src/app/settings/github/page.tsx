"use client";

import React, { useState } from "react";
import { Key, ShieldCheck, RefreshCw, FolderGit2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useChatStore } from "@/store/use-chat-store";
import { refreshRepositories } from "@/lib/api";

export default function GitHubSettingsPage() {
  const { githubUser, repositories, loadRepositories, setAuthModalOpen } = useChatStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleSync = async () => {
    setRefreshing(true);
    try {
      await refreshRepositories();
      await loadRepositories(true);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
        {/* Page Header */}
        <div className="pb-5 border-b border-slate-800">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Key className="h-6 w-6 text-indigo-400" />
            <span>Connected GitHub Account</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Manage your GitHub Personal Access Token (PAT), organization discovery, and repository permissions.
          </p>
        </div>

        {/* Identity Card */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              {githubUser?.avatar_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={githubUser.avatar_url}
                  alt={githubUser.login}
                  className="w-12 h-12 rounded-xl border border-indigo-500/40"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-lg font-bold">
                  GH
                </div>
              )}
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-white">
                    {githubUser?.name || githubUser?.login || "Connected GitHub Account"}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Active PAT
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  @{githubUser?.login || "dabeerqureshi"}
                </div>
              </div>
            </div>

            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors cursor-pointer shadow-sm self-start sm:self-auto"
            >
              Update Token
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400 text-[11px] font-mono uppercase">Repositories</div>
              <div className="text-lg font-bold text-white mt-0.5 font-tabular">
                {repositories.length}
              </div>
              <div className="text-[10px] text-slate-500">Auto-discovered</div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400 text-[11px] font-mono uppercase">Token Scopes</div>
              <div className="text-xs font-mono font-medium text-emerald-400 mt-1">
                repo, read:org, workflow
              </div>
              <div className="text-[10px] text-slate-500">Fine-grained access</div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400 text-[11px] font-mono uppercase">HITL Security</div>
              <div className="text-xs font-mono font-medium text-indigo-400 mt-1">
                HMAC SHA-256 Gated
              </div>
              <div className="text-[10px] text-slate-500">Write confirmation enforced</div>
            </div>
          </div>
        </div>

        {/* Sync Repositories Action */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-white">Re-synchronize Repositories</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Query GitHub API to detect any recently created, forked, or invited repositories.
            </p>
          </div>

          <button
            onClick={handleSync}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm self-start sm:self-auto"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            <span>Sync Now</span>
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
