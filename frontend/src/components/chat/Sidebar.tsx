"use client";

import React, { useEffect, useState } from "react";
import { MessageSquare, Plus, Trash2, FolderGit2, Search, Sparkles } from "lucide-react";
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

  const filteredConversations = (Array.isArray(conversations) ? conversations : []).filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase().trim()) ||
      (c.active_repo && c.active_repo.toLowerCase().includes(search.toLowerCase().trim()))
  );

  return (
    <aside className="w-72 border-r border-border/80 glass-panel flex flex-col h-[calc(100vh-53px)] select-none">
      {/* New Session Button */}
      <div className="p-3 border-b border-border/60">
        <button
          onClick={() =>
            startNewConversation(
              activeRepo
                ? `Session: ${activeRepo.split("/").pop()}`
                : "New Workspace Session"
            )
          }
          className="w-full flex items-center justify-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-2 px-4 rounded-xl text-xs transition-all shadow-sm shadow-primary/20 glow-hover cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Workspace Session</span>
        </button>

        {/* Filter Sessions Input */}
        <div className="mt-2.5 relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-secondary/40 border border-border/60 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
        <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider font-mono">
          Recent Sessions
        </div>

        {filteredConversations.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-8">
            No matching sessions.
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            return (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                  isActive
                    ? "bg-secondary text-foreground font-semibold border border-primary/30 shadow-sm"
                    : "hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate min-w-0">
                  <MessageSquare
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isActive ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <div className="truncate">
                    <span className="truncate block font-medium">{conv.title}</span>
                    {conv.active_repo && (
                      <span className="text-[10px] text-muted-foreground font-mono block truncate">
                        {conv.active_repo}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity cursor-pointer text-muted-foreground"
                  title="Delete session"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Branding */}
      <div className="p-3 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between font-mono bg-secondary/20">
        <div className="flex items-center space-x-1.5">
          <FolderGit2 className="h-3.5 w-3.5 text-primary" />
          <span className="truncate max-w-[150px]">{activeRepo}</span>
        </div>
        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
          v1.0
        </span>
      </div>
    </aside>
  );
}
