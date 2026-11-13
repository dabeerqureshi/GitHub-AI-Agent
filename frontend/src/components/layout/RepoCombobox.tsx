"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  GitBranch,
  ChevronDown,
  Search,
  Check,
  Lock,
  Globe,
  RefreshCw,
  PlusCircle,
  Key,
  FolderGit2,
} from "lucide-react";
import { useChatStore } from "@/store/use-chat-store";
import { refreshRepositories } from "@/lib/api";

export function RepoCombobox() {
  const {
    activeRepo,
    setActiveRepo,
    repositories,
    loadRepositories,
    setAuthModalOpen,
    githubUser,
  } = useChatStore();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    try {
      await refreshRepositories();
      await loadRepositories();
    } catch (err) {
      console.error("Failed to refresh repos", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredRepos = repositories.filter((r) =>
    r.full_name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const selectedRepoRecord = repositories.find((r) => r.full_name === activeRepo);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Combobox Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-xs bg-secondary/60 hover:bg-secondary/90 px-3 py-1.5 rounded-xl border border-border/80 transition-all shadow-sm glow-hover group cursor-pointer"
        aria-expanded={isOpen}
      >
        <FolderGit2 className="h-3.5 w-3.5 text-primary group-hover:scale-105 transition-transform" />
        <span className="font-mono font-semibold text-foreground max-w-[180px] truncate">
          {activeRepo || "Select Repository"}
        </span>

        {selectedRepoRecord && (
          <span className="flex items-center text-[10px] px-1.5 py-0.5 rounded bg-background/80 text-muted-foreground border border-border">
            {selectedRepoRecord.is_private ? (
              <Lock className="h-2.5 w-2.5 mr-1 text-amber-400" />
            ) : (
              <Globe className="h-2.5 w-2.5 mr-1 text-blue-400" />
            )}
            <span className="font-mono">{selectedRepoRecord.default_branch || "main"}</span>
          </span>
        )}

        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 rounded-2xl glass-panel border border-border shadow-2xl z-50 overflow-hidden animate-slide-up text-card-foreground">
          {/* Search Header */}
          <div className="p-2.5 border-b border-border/60 bg-secondary/30">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search repositories..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-background/80 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono placeholder:text-muted-foreground/60"
                autoFocus
              />
            </div>
          </div>

          {/* Repository List */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5 divide-y divide-border/20">
            {filteredRepos.length > 0 ? (
              filteredRepos.map((repo) => {
                const isSelected = repo.full_name === activeRepo;
                return (
                  <button
                    key={repo.id || repo.full_name}
                    type="button"
                    onClick={() => {
                      setActiveRepo(repo.full_name);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-secondary/60 text-card-foreground"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {repo.is_private ? (
                        <Lock className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                      ) : (
                        <Globe className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                      )}
                      <div className="truncate">
                        <div className="text-xs font-mono font-medium truncate">
                          <span className="text-muted-foreground">{repo.owner}/</span>
                          <span className="font-semibold">{repo.name}</span>
                        </div>
                        {repo.description && (
                          <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                            {repo.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                      <span className="text-[10px] text-muted-foreground font-mono bg-background/50 px-1.5 py-0.5 rounded border border-border">
                        {repo.default_branch || "main"}
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-muted-foreground">
                <p>No matching repositories found.</p>
                {!githubUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setAuthModalOpen(true);
                    }}
                    className="mt-2 text-primary hover:underline font-medium inline-flex items-center"
                  >
                    <Key className="h-3 w-3 mr-1" />
                    Connect GitHub PAT
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-2 border-t border-border/60 bg-secondary/20 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-1 text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setAuthModalOpen(true);
              }}
              className="flex items-center space-x-1 text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-md hover:bg-primary/10 cursor-pointer font-medium"
            >
              <Key className="h-3 w-3" />
              <span>{githubUser ? "Manage PAT" : "Add GitHub Token"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
