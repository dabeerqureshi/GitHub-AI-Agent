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
  Sparkles,
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
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <FolderGit2 className="h-6 w-6 text-indigo-400" />
              <span>Repositories</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Accessible GitHub repositories discovered through your Personal Access Token.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="self-start sm:self-auto flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-indigo-400 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Sync GitHub</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by repository name or description..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
            {["ALL", "PUBLIC", "PRIVATE"].map((vis) => (
              <button
                key={vis}
                onClick={() => setFilterVisibility(vis)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  filterVisibility === vis
                    ? "bg-indigo-600 text-white font-semibold shadow-sm"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800"
                }`}
              >
                {vis}
              </button>
            ))}
          </div>
        </div>

        {/* Repositories Table */}
        <div className="rounded-xl bg-slate-900 overflow-hidden border border-slate-800 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Repository</th>
                  <th className="p-3.5">Visibility</th>
                  <th className="p-3.5">Default Branch</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredRepos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500 font-mono">
                      No repositories found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredRepos.map((repo) => {
                    const isSelected = activeRepo === repo.full_name;
                    return (
                      <tr
                        key={repo.id}
                        className={`hover:bg-slate-800/50 transition-colors ${
                          isSelected ? "bg-indigo-500/10" : ""
                        }`}
                      >
                        <td className="p-3.5 font-medium text-white">
                          <div className="flex items-center space-x-2.5">
                            <FolderGit2 className="h-4 w-4 text-indigo-400 shrink-0" />
                            <span className="font-mono text-sm font-semibold">{repo.full_name}</span>
                            {isSelected && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Active
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-400">
                            {repo.is_private ? (
                              <>
                                <Lock className="h-3.5 w-3.5 text-amber-400" />
                                <span>Private</span>
                              </>
                            ) : (
                              <>
                                <Globe className="h-3.5 w-3.5 text-sky-400" />
                                <span>Public</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-400">
                          <div className="flex items-center space-x-1.5">
                            <GitBranch className="h-3.5 w-3.5 text-slate-500" />
                            <span>{repo.default_branch || "main"}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-400 max-w-md truncate">
                          {repo.description || "—"}
                        </td>
                        <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => setActiveRepo(repo.full_name)}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                                : "bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-800"
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
                            className="inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
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
