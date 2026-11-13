"use client";

import React, { useEffect } from "react";
import { MessageSquare, Plus, Trash2, FolderGit2 } from "lucide-react";
import { useChatStore } from "@/store/use-chat-store";
import { deleteConversation } from "@/lib/api";

export function Sidebar() {
  const {
    conversations,
    activeConversationId,
    loadConversations,
    selectConversation,
    startNewConversation,
  } = useChatStore();

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

  return (
    <aside className="w-72 border-r bg-card flex flex-col h-[calc(100vh-57px)]">
      <div className="p-4 border-b">
        <button
          onClick={() => startNewConversation()}
          className="w-full flex items-center justify-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2 px-4 rounded-md text-sm transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>New Session</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Recent Sessions
        </div>

        {!Array.isArray(conversations) || conversations.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-8">
            No active sessions. Start a new session above.
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            return (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`group flex items-center justify-between p-2.5 rounded-md cursor-pointer text-sm transition-colors ${
                  isActive
                    ? "bg-accent text-accent-foreground font-medium border"
                    : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{conv.title}</span>
                </div>
                <button
                  onClick={(e) => handleDelete(e, conv.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                  title="Delete session"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t text-xs text-muted-foreground flex items-center space-x-2">
        <FolderGit2 className="h-4 w-4" />
        <span>Local-First Hybrid Agent</span>
      </div>
    </aside>
  );
}
