"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FolderGit2,
  Search,
  Lock,
  Globe,
  GitBranch,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useChatStore } from "@/store/use-chat-store";
import { refreshRepositories } from "@/lib/api";

export default function RepositoriesPage() {
  const {
    repositories,
    activeRepo,
    setActiveRepo,
    loadRepositories,
    startNewConversation,
    sendUserMessage,
  } = useChatStore();

  const [search, setSearch] = useState("");
  const [filterVisibility, setFilterVisibility] = useState<string>("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshRepositories();
      await loadRepositories();
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredRepos = repositories.filter((r) => {
    const matchesSearch =
      r.full_name.toLowerCase().includes(search.toLowerCase().trim()) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase().trim()));
    if (filterVisibility === "PRIVATE") return matchesSearch && r.is_private;
    if (filterVisibility === "PUBLIC") return matchesSearch && !r.is_private;
    return matchesSearch;
  });

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#252D3A] gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
              <FolderGit2 className="h-6 w-6 text-[#818CF8]" />
              <span>Repositories</span>
            </h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Accessible GitHub repositories discovered through your Personal Access Token.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#121722] hover:bg-[#171E2B] border border-[#252D3A] text-xs font-medium text-[#F1F5F9] transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#818CF8] ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Sync GitHub</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#64748B]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by repository name or description..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#121722] border border-[#252D3A] rounded-md text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-[#818CF8]"
            />
          </div>

          <div className="flex items-center space-x-2">
            {["ALL", "PUBLIC", "PRIVATE"].map((vis) => (
              <button
                key={vis}
                onClick={() => setFilterVisibility(vis)}
                className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors ${
                  filterVisibility === vis
                    ? "bg-[#171E2B] text-[#F1F5F9] font-semibold border border-[#818CF8]/40"
                    : "bg-[#0D1017] text-[#64748B] hover:text-[#F1F5F9] border border-[#252D3A]"
                }`}
              >
                {vis}
              </button>
            ))}
          </div>
        </div>

        {/* Repositories Table */}
        <div className="rounded-xl surface-card overflow-hidden border border-[#252D3A]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0D1017] text-[#64748B] font-mono border-b border-[#252D3A]">
                <tr>
                  <th className="p-3.5">Repository</th>
                  <th className="p-3.5">Visibility</th>
                  <th className="p-3.5">Default Branch</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252D3A]">
                {filteredRepos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[#64748B] font-mono">
                      No repositories found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRepos.map((repo) => {
                    const isSelected = activeRepo === repo.full_name;
                    return (
                      <tr
                        key={repo.id}
                        className={`hover:bg-[#171E2B]/50 transition-colors ${
                          isSelected ? "bg-[#171E2B]/30" : ""
                        }`}
                      >
                        <td className="p-3.5 font-medium text-[#F1F5F9]">
                          <div className="flex items-center space-x-2">
                            <FolderGit2 className="h-4 w-4 text-[#818CF8] shrink-0" />
                            <span className="font-mono text-sm font-semibold">{repo.full_name}</span>
                            {isSelected && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-[#818CF8] border border-indigo-500/30">
                                Active
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#94A3B8]">
                            {repo.is_private ? (
                              <>
                                <Lock className="h-3 w-3 text-amber-400" />
                                <span>Private</span>
                              </>
                            ) : (
                              <>
                                <Globe className="h-3 w-3 text-[#38BDF8]" />
                                <span>Public</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-[#94A3B8]">
                          <div className="flex items-center space-x-1">
                            <GitBranch className="h-3 w-3 text-[#64748B]" />
                            <span>{repo.default_branch || "main"}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-[#94A3B8] max-w-md truncate">
                          {repo.description || "—"}
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            onClick={() => setActiveRepo(repo.full_name)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-indigo-500/20 text-[#818CF8] border-indigo-500/40"
                                : "bg-[#121722] hover:bg-[#171E2B] text-[#F1F5F9] border-[#252D3A]"
                            }`}
                          >
                            {isSelected ? "Selected" : "Select"}
                          </button>
                          <Link
                            href="/chat"
                            onClick={() => {
                              setActiveRepo(repo.full_name);
                              startNewConversation(`Session: ${repo.name}`);
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-[#818CF8] hover:bg-[#818CF8]/90 text-[#090B10] transition-colors"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>Chat</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
