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
              ? "fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-[#252526] shadow-2xl animate-slide-up border-r border-[#333333]"
              : "hidden"
          }
          md:flex md:static md:flex-col md:w-64 lg:w-72 md:bg-[#252526] border-r border-[#333333] h-full select-none shrink-0 font-sans
        `}
      >
        {/* Header: Action & Filter */}
        <div className="p-3 border-b border-[#333333] bg-[#252526]">
          <div className="flex items-center justify-between mb-2 md:hidden">
            <span className="text-xs font-semibold text-white uppercase tracking-wider">
              Workspace Sessions
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded text-[#858585] hover:text-white hover:bg-[#2a2d2e] transition-colors cursor-pointer"
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
            className="w-full flex items-center justify-center space-x-2 bg-[#007acc] hover:bg-[#0e639c] text-white font-medium py-2 px-3 rounded-md text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Workspace Session</span>
          </button>

          {/* Filter Sessions Input */}
          <div className="mt-2.5 relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#858585]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter sessions..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-[#1e1e1e] border border-[#333333] text-white placeholder:text-[#858585] focus:outline-none focus:border-[#007acc] transition-colors"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-[#252526]">
          <div className="px-2 py-1 flex items-center justify-between text-[11px] font-semibold text-[#858585] uppercase tracking-wider">
            <span>Conversations</span>
            <span className="text-[#858585] font-mono text-[10px]">
              {filteredConversations.length}
            </span>
          </div>

          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#858585]">
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
                  className={`group relative flex items-center justify-between p-2.5 rounded-md text-xs transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#007acc]/20 text-white border border-[#007acc]/50 font-medium"
                      : "text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white"
                  }`}
                >
                  <div className="flex items-start space-x-2 min-w-0 pr-6">
                    <MessageSquare
                      className={`h-4 w-4 shrink-0 mt-0.5 ${
                        isActive ? "text-[#3794ff]" : "text-[#858585] group-hover:text-[#cccccc]"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate leading-tight font-medium">
                        {conv.title.startsWith("Chat on ") ? "Workspace Session" : conv.title}
                      </p>
                      <div className="flex items-center space-x-1.5 mt-1 text-[10px] text-[#858585]">
                        {conv.active_repo && (
                          <span className="truncate max-w-[120px] font-mono text-[#858585]">
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
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-[#f14c4c] text-[#858585] transition-opacity rounded cursor-pointer"
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
        <div className="p-3 border-t border-[#333333] bg-[#1f1f1f] text-xs">
          <div className="flex items-center justify-between text-[11px] text-[#858585]">
            <span className="flex items-center space-x-1">
              <FolderGit2 className="h-3.5 w-3.5 text-[#3794ff] shrink-0" />
              <span className="truncate max-w-[150px]">
                {activeRepo ? activeRepo.split("/").pop() : "No repo selected"}
              </span>
            </span>
            <span className="text-[10px] text-[#73c991] font-mono font-medium">HITL Ready</span>
          </div>
        </div>
      </aside>
    </>
  );
}
