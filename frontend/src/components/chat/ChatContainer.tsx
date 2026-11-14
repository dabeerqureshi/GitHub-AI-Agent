"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Send,
  Loader2,
  Sparkles,
  Shield,
  ListOrdered,
  FileSearch,
  Bug,
  GitPullRequest,
  Layers,
  FolderGit2,
} from "lucide-react";
import { useChatStore } from "@/store/use-chat-store";
import { MessageItem } from "@/components/chat/MessageItem";
import { ApprovalCard } from "@/components/approvals/ApprovalCard";
import { ModelDropdown } from "@/components/models/ModelDropdown";

export function ChatContainer() {
  const {
    activeConversation,
    activeRepo,
    pendingApprovals,
    isSending,
    currentPlan,
    streamingStatus,
    sendUserMessage,
    loadConversations,
  } = useChatStore();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [activeConversation?.messages, pendingApprovals]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    const msg = input.trim();
    setInput("");
    sendUserMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleQuickPrompt = (promptText: string) => {
    if (isSending) return;
    sendUserMessage(promptText);
  };

  const targetName = activeRepo || "the repository";
  const starterCards = [
    {
      title: "Architecture Summary",
      desc: "Analyze tree, modules, dependencies & design patterns",
      prompt: `Explain architecture of ${targetName}`,
      icon: Layers,
    },
    {
      title: "Inspect Issues & Bugs",
      desc: "Search and categorize open defects and backlog",
      prompt: `Find open issues and bug reports in ${targetName}`,
      icon: Bug,
    },
    {
      title: "Review Pull Requests",
      desc: "Conduct automated diff analysis and security review",
      prompt: `Review recent pull requests and diffs in ${targetName}`,
      icon: GitPullRequest,
    },
    {
      title: "Diagnose CI Failures",
      desc: "Isolate failing workflow steps and synthesize fixes",
      prompt: `Analyze failing CI workflow runs in ${targetName}`,
      icon: FileSearch,
    },
  ];

  const messages = activeConversation?.messages || [];
  const hasMessages = messages.length > 0;
  const conversationTitle = activeConversation
    ? activeConversation.title.startsWith("Chat on ")
      ? "Workspace Session"
      : activeConversation.title
    : "Workspace Session";

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden font-sans">
      {/* Conversation Subheader */}
      <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2.5 min-w-0">
          <span className="font-semibold text-white text-sm tracking-tight truncate max-w-[180px] sm:max-w-none">
            {conversationTitle}
          </span>
          <span className="text-slate-600 hidden sm:inline">/</span>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-950 text-xs text-slate-300 border border-slate-800 truncate">
            <FolderGit2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span className="font-medium truncate max-w-[140px] sm:max-w-[240px]">
              {activeRepo || "No repo selected"}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Quick Model Selector in Header */}
          <div className="sm:hidden">
            <ModelDropdown compact align="right" direction="down" />
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-md shrink-0">
            <Shield className="h-3 w-3 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline font-medium">Cryptographic HITL Enforced</span>
            <span className="sm:hidden font-medium">HITL</span>
          </div>
        </div>
      </div>

      {/* Plan Visualizer (if active) */}
      {currentPlan.length > 0 && (
        <div className="bg-slate-900/40 border-b border-slate-800 px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs animate-slide-up">
          <div className="flex items-center space-x-1.5 font-semibold text-indigo-400 shrink-0 text-xs">
            <ListOrdered className="h-3.5 w-3.5" />
            <span>Agent Plan:</span>
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto w-full py-0.5 text-slate-400">
            {currentPlan.map((step, idx) => {
              const cleanStep = step.replace(/^\d+[\.\)]\s*/, "");
              return (
                <div
                  key={idx}
                  className="whitespace-nowrap bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800 text-xs flex items-center space-x-1.5 shrink-0"
                >
                  <span className="text-indigo-400 font-bold">{idx + 1}.</span>
                  <span className="text-slate-200">{cleanStep}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Message List / Starter Screen */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-5 space-y-4 bg-slate-950" role="log" aria-live="polite">
        <div className="max-w-4xl mx-auto space-y-4">
          {!hasMessages ? (
            /* Empty State: Quick Action Starter Cards */
            <div className="py-6 sm:py-10 animate-fade-in space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-medium mb-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Agent ready for instructions</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  How can I assist with <span className="text-indigo-400 font-mono">{activeRepo || "your code"}</span>?
                </h2>
                <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
                  Select an autonomous workflow below or enter your technical prompt to get started.
                </p>
              </div>

              {/* 4 Enterprise Starter Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {starterCards.map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => handleQuickPrompt(card.prompt)}
                      disabled={isSending}
                      className="flex items-start space-x-3.5 p-4 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/50 text-left transition-all group cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <div className="p-2 rounded-lg bg-slate-950 text-indigo-400 border border-slate-800 group-hover:border-indigo-500/40 transition-colors shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm text-white group-hover:text-indigo-300 transition-colors block">
                          {card.title}
                        </span>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {card.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Render Messages */
            messages.map((msg) => (
              <MessageItem key={msg.id} message={msg} />
            ))
          )}

          {/* Pending Approval Cards */}
          {pendingApprovals.map((approval) => (
            <ApprovalCard key={approval.id} approval={approval} />
          ))}

          {/* Streaming / Tool Execution Status Indicator */}
          {isSending && (
            <div
              className="flex items-center space-x-3 text-sm py-2.5 px-4 rounded-xl bg-slate-900 border border-indigo-500/40 max-w-md animate-pulse shadow-md font-medium text-slate-200"
              role="status"
            >
              <Loader2 className="h-4 w-4 animate-spin text-indigo-400 shrink-0" />
              <span>
                {streamingStatus || "Agent is synthesizing execution plan..."}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Bar & Controls */}
      <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Quick Toolbar: Model Selector & Repository Scope */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <div className="flex items-center space-x-2">
              <span className="text-slate-500 hidden sm:inline">Engine:</span>
              <ModelDropdown compact align="left" direction="up" />
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <FolderGit2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span>
                Scoped to: <strong className="text-slate-200 font-mono">{activeRepo || "global"}</strong>
              </span>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-end space-x-2"
            aria-label="Message input form"
          >
            <div className="flex-1 rounded-xl border border-slate-800 bg-slate-900 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Instruction input"
                placeholder={`Instruct agent on ${activeRepo || "repository"} (e.g. 'Explain architecture', 'Check failing tests')...`}
                rows={2}
                className="w-full resize-none bg-transparent p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isSending}
              aria-label="Send instruction"
              className="h-11 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm flex items-center space-x-2 transition-all shadow-md hover:shadow-indigo-500/25 disabled:opacity-40 disabled:pointer-events-none shrink-0 cursor-pointer"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>Send</span>
            </button>
          </form>

          <div className="text-[11px] text-center text-slate-500 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 pt-0.5">
            <span>Enter to send</span>
            <span>•</span>
            <span>Shift+Enter for new line</span>
            <span>•</span>
            <span>Cryptographic HITL Enforced</span>
          </div>
        </div>
      </div>
    </div>
  );
}
