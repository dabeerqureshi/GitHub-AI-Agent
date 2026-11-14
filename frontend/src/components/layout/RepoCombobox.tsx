"use client";

import React, { useState, useRef, useEffect } from "react";
import {
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
import { refreshRepositories, syncRepository } from "@/lib/api";

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
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    try {
      await refreshRepositories();
      await loadRepositories(true);
    } catch (err) {
      console.error("Failed to refresh repos", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddCustomRepo = async (fullName: string) => {
    const trimmed = fullName.trim();
    if (!trimmed.includes("/") || trimmed.split("/").length !== 2) return;
    setIsAddingCustom(true);
    try {
      await syncRepository(trimmed);
      await loadRepositories(true);
      setActiveRepo(trimmed);
      setSearchQuery("");
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to add repository", err);
    } finally {
      setIsAddingCustom(false);
    }
  };

  const filteredRepos = repositories.filter((r) =>
    r.full_name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const selectedRepoRecord = repositories.find((r) => r.full_name === activeRepo);
  const canAddAsNew =
    searchQuery.includes("/") &&
    searchQuery.trim().split("/").length === 2 &&
    searchQuery.trim().split("/")[0].length > 0 &&
    searchQuery.trim().split("/")[1].length > 0 &&
    !repositories.some(
      (r) => r.full_name.toLowerCase() === searchQuery.trim().toLowerCase()
    );

  return (
    <div className="relative font-sans inline-block" ref={dropdownRef}>
      {/* Combobox Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-xs sm:text-sm bg-[#252526] hover:bg-[#2a2d2e] px-3 py-1.5 rounded-md border border-[#3c3c3c] hover:border-[#007acc] transition-all text-[#cccccc] hover:text-white group cursor-pointer shadow-sm select-none"
        aria-expanded={isOpen}
      >
        <FolderGit2 className="h-4 w-4 text-[#3794ff] group-hover:scale-105 transition-transform shrink-0" />
        <span className="font-medium max-w-[130px] sm:max-w-[200px] truncate text-xs sm:text-sm text-white">
          {activeRepo || "Select Repository"}
        </span>

        {selectedRepoRecord && (
          <span className="hidden sm:flex items-center text-[10px] px-1.5 py-0.5 rounded bg-[#1e1e1e] text-[#858585] border border-[#333333] font-mono ml-0.5">
            {selectedRepoRecord.is_private ? (
              <Lock className="h-2.5 w-2.5 mr-1 text-[#cca700]" />
            ) : (
              <Globe className="h-2.5 w-2.5 mr-1 text-[#4ec9b0]" />
            )}
            <span>{selectedRepoRecord.default_branch || "main"}</span>
          </span>
        )}

        <ChevronDown
          className={`h-3.5 w-3.5 text-[#858585] transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-white" : ""
          }`}
        />
      </button>

      {/* Popover Dropdown (100% Solid, Opaque VS Code Surface, Left-Aligned) */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-[min(24rem,calc(100vw-1.5rem))] rounded-md bg-[#252526] border border-[#3c3c3c] shadow-2xl shadow-black/90 z-50 overflow-hidden animate-slide-up text-[#cccccc]">
          {/* Search Header */}
          <div className="p-2.5 border-b border-[#333333] bg-[#1f1f1f]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#858585]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search repositories..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#1e1e1e] border border-[#3c3c3c] rounded-md text-white focus:outline-none focus:border-[#007acc] focus:ring-1 focus:ring-[#007acc] placeholder:text-[#858585]"
                autoFocus
              />
            </div>
          </div>

          {/* Repository List */}
          <div className="max-h-64 overflow-y-auto p-1.5 space-y-1 bg-[#252526]">
            {canAddAsNew && (
              <button
                type="button"
                disabled={isAddingCustom}
                onClick={() => handleAddCustomRepo(searchQuery)}
                className="w-full flex items-center justify-between p-2 rounded-md bg-[#007acc]/15 hover:bg-[#007acc]/25 text-[#3794ff] border border-[#007acc]/30 text-xs transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-2 truncate">
                  <PlusCircle className="h-4 w-4 shrink-0 text-[#3794ff]" />
                  <span className="font-mono truncate">Add &amp; sync &apos;{searchQuery.trim()}&apos;</span>
                </div>
                <span className="text-[10px] bg-[#007acc]/30 px-1.5 py-0.5 rounded font-mono shrink-0 ml-1">
                  {isAddingCustom ? "Syncing..." : "Add"}
                </span>
              </button>
            )}

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
                    className={`w-full flex items-center justify-between p-2 rounded-md text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#007acc]/20 text-white border border-[#007acc]/50 font-medium"
                        : "hover:bg-[#2a2d2e] text-[#cccccc] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      {repo.is_private ? (
                        <Lock className="h-3.5 w-3.5 text-[#cca700] shrink-0" />
                      ) : (
                        <Globe className="h-3.5 w-3.5 text-[#4ec9b0] shrink-0" />
                      )}
                      <div className="truncate">
                        <div className="text-xs font-medium truncate">
                          <span className="text-[#858585]">{repo.owner}/</span>
                          <span className="font-semibold text-white">{repo.name}</span>
                        </div>
                        {repo.description && (
                          <div className="text-[11px] text-[#858585] truncate max-w-[200px]">
                            {repo.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className="text-[10px] text-[#858585] font-mono bg-[#1e1e1e] px-1.5 py-0.5 rounded border border-[#333333]">
                        {repo.default_branch || "main"}
                      </span>
                      {isSelected && <Check className="h-4 w-4 text-[#3794ff]" />}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-[#858585]">
                <p>No matching repositories found.</p>
                <p className="text-[11px] mt-1 text-[#858585]">
                  Type <span className="font-mono text-white font-semibold">owner/repo</span> above to sync any repository.
                </p>
                {!githubUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setAuthModalOpen(true);
                    }}
                    className="mt-2.5 text-[#3794ff] hover:underline font-medium inline-flex items-center cursor-pointer text-xs"
                  >
                    <Key className="h-3.5 w-3.5 mr-1" />
                    Connect GitHub PAT
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-2 border-t border-[#333333] bg-[#1f1f1f] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-1.5 text-[#858585] hover:text-white transition-colors px-2 py-1 rounded hover:bg-[#2a2d2e] cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin text-[#3794ff]" : ""}`} />
              <span>Refresh list</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setAuthModalOpen(true);
              }}
              className="flex items-center space-x-1 text-[#3794ff] hover:underline transition-colors px-2 py-1 rounded cursor-pointer font-medium"
            >
              <Key className="h-3 w-3" />
              <span>{githubUser ? "Manage Token" : "Add Token"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
