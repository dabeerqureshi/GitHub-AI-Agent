"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { useChatStore } from "@/store/use-chat-store";
import { deleteConversation } from "@/lib/api";

export function Sidebar() {
  const pathname = usePathname();
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

  const mobileNavLinks = [
    { href: "/", label: "Workspace", icon: Activity },
    { href: "/approvals", label: "Approvals", icon: FileCheck2 },
    { href: "/runs", label: "Runs & Timeline", icon: GitFork },
    { href: "/audit", label: "Audit Log", icon: FileText },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden animate-fade-in"
        />
      )}

      {/* Main Sidebar (Desktop fixed, Mobile sliding drawer) */}
      <aside
        className={`
          ${
            isSidebarOpen
              ? "fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-card/98 backdrop-blur-xl shadow-2xl animate-slide-right"
              : "hidden"
          }
          md:flex md:static md:flex-col md:w-72 md:bg-transparent border-r border-border glass-panel h-[calc(100vh-53px)] select-none
        `}
      >
        {/* Header: Action & Filter */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2 md:hidden">
            <span className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider">
              Workspace Sessions
            </span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => {
              startNewConversation(
                activeRepo
                  ? `Session: ${activeRepo.split("/").pop()}`
                  : "New Workspace Session"
              );
              if (isSidebarOpen) setSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-2 px-4 rounded-xl text-xs transition-all shadow-sm shadow-primary/25 cursor-pointer"
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
              placeholder="Filter sessions..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-secondary/80 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider font-mono">
            Active Sessions
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
                  onClick={() => handleSelect(conv.id)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                    isActive
                      ? "bg-secondary text-foreground font-semibold border border-primary/40 shadow-xs"
                      : "hover:bg-secondary/60 text-muted-foreground hover:text-foreground border border-transparent"
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

        {/* Mobile Navigation Drawer Links (visible only on mobile) */}
        <div className="md:hidden border-t border-border/60 p-2.5 space-y-1 bg-secondary/20">
          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider font-mono">
            Navigation
          </div>
          {mobileNavLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Footer Branding */}
        <div className="p-3 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between font-mono bg-secondary/20">
          <div className="flex items-center space-x-1.5 min-w-0">
            <FolderGit2 className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate max-w-[140px] font-semibold text-foreground">
              {activeRepo || "No repo selected"}
            </span>
          </div>
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 shrink-0">
            v1.0
          </span>
        </div>
      </aside>
    </>
  );
}
