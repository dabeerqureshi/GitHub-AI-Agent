"use client";

import React, { useEffect, useState } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  FolderGit2,
  Search,
  X,
  FileCheck2,
  GitFork,
  FileText,
  Activity,
  Layers,
} from "lucide-react";
import { useChatStore } from "@/store/use-chat-store";
import { deleteConversation } from "@/lib/api";

export function Sidebar() {
  const {
    conversations,
    activeConversationId,
    loadConversations,
    selectConversation,
    startNewConversation,
    activeRepo,
    isSidebarOpen,
    setSidebarOpen,
  } = useChatStore();

  const [search, setSearch] = useState("");

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Delete this conversation?")) {
      await deleteConversation(id);
      await loadConversations();
    }
  };

  const handleSelect = (id: string) => {
    selectConversation(id);
    if (isSidebarOpen) {
      setSidebarOpen(false);
    }
  };

  const filteredConversations = (Array.isArray(conversations) ? conversations : []).filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase().trim()) ||
      (c.active_repo && c.active_repo.toLowerCase().includes(search.toLowerCase().trim()))
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden animate-fade-in"
        />
      )}

      {/* Main Sidebar: Responsive Drawer on Mobile, Fixed Column on Desktop */}
      <aside
        className={`
          ${
            isSidebarOpen
              ? "fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-slate-900 shadow-2xl animate-slide-up border-r border-slate-800"
              : "hidden"
          }
          md:flex md:static md:flex-col md:w-64 lg:w-72 md:bg-slate-900/90 border-r border-slate-800 h-full select-none shrink-0 font-sans
        `}
      >
        {/* Header: Action & Filter */}
        <div className="p-3 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between mb-2 md:hidden">
            <span className="text-xs font-semibold text-white uppercase tracking-wider">
              Workspace Sessions
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* New Workspace Session Button */}
          <button
            onClick={() => {
              startNewConversation(
                activeRepo
                  ? `Session: ${activeRepo.split("/").pop()}`
                  : "New Workspace Session"
              );
              if (isSidebarOpen) setSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-3 rounded-lg text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Workspace Session</span>
          </button>

          {/* Filter Sessions Input */}
          <div className="mt-2.5 relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter sessions..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1 flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <span>Conversations</span>
            <span className="text-slate-500 font-mono text-[10px]">
              {filteredConversations.length}
            </span>
          </div>

          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-30" />
              <p>No active sessions found</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelect(conv.id)}
                  className={`group relative flex items-center justify-between p-2.5 rounded-lg text-xs transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-medium"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <div className="flex items-start space-x-2 min-w-0 pr-6">
                    <MessageSquare
                      className={`h-4 w-4 shrink-0 mt-0.5 ${
                        isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate leading-tight font-medium">
                        {conv.title.startsWith("Chat on ") ? "Workspace Session" : conv.title}
                      </p>
                      <div className="flex items-center space-x-1.5 mt-1 text-[10px] text-slate-500">
                        {conv.active_repo && (
                          <span className="truncate max-w-[120px] font-mono text-slate-400">
                            {conv.active_repo.split("/").pop()}
                          </span>
                        )}
                        <span>•</span>
                        <span>
                          {new Date(conv.updated_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 text-slate-500 transition-opacity rounded cursor-pointer"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Quick Repo context */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center space-x-1">
              <FolderGit2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span className="truncate max-w-[150px]">
                {activeRepo ? activeRepo.split("/").pop() : "No repo selected"}
              </span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono font-medium">HITL Ready</span>
          </div>
        </div>
      </aside>
    </>
  );
}
