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
  HelpCircle,
  AlertTriangle,
  ShieldCheck,
  Terminal,
  GitBranch,
  Code2,
  FileText,
  GitCommit,
  PlayCircle,
} from "lucide-react";
import { useChatStore } from "@/store/use-chat-store";
import { MessageItem } from "@/components/chat/MessageItem";
import { ApprovalCard } from "@/components/approvals/ApprovalCard";
import { ModelDropdown } from "@/components/models/ModelDropdown";

type OperatingMode = "ask" | "analyze" | "execute";

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
  const [activeMode, setActiveMode] = useState<OperatingMode>("ask");
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

  const starterCardsByMode: Record<OperatingMode, Array<{
    title: string;
    desc: string;
    prompt: string;
    icon: any;
    color: string;
  }>> = {
    ask: [
      {
        title: "Repository Overview",
        desc: "Summarize README, dependencies, languages & directory tree",
        prompt: `Give me an overview of ${targetName}`,
        icon: FolderGit2,
        color: "text-[#3794ff] bg-[#3794ff]/10 border-[#3794ff]/30 hover:border-[#3794ff]",
      },
      {
        title: "Inspect Open Issues",
        desc: "Search, filter, and inspect open issues, labels, and assignees",
        prompt: `Find open issues and bug reports in ${targetName}`,
        icon: Bug,
        color: "text-[#4ec9b0] bg-[#4ec9b0]/10 border-[#4ec9b0]/30 hover:border-[#4ec9b0]",
      },
      {
        title: "Recent Commits",
        desc: "Inspect latest commits, authors, and change history on main",
        prompt: `Show recent commits on main in ${targetName}`,
        icon: GitCommit,
        color: "text-[#cca700] bg-[#cca700]/10 border-[#cca700]/30 hover:border-[#cca700]",
      },
      {
        title: "GitHub Actions Status",
        desc: "Check recent workflow runs, CI pipeline health, and logs",
        prompt: `Show recent GitHub Actions workflow runs in ${targetName}`,
        icon: PlayCircle,
        color: "text-[#c586c0] bg-[#c586c0]/10 border-[#c586c0]/30 hover:border-[#c586c0]",
      },
    ],
    analyze: [
      {
        title: "Architecture Analysis",
        desc: "Analyze tree, modules, dependencies & application entry points",
        prompt: `Explain architecture of ${targetName}`,
        icon: Layers,
        color: "text-[#4ec9b0] bg-[#4ec9b0]/10 border-[#4ec9b0]/30 hover:border-[#4ec9b0]",
      },
      {
        title: "Technical Debt & Smells",
        desc: "Detect code smells, oversized modules, and debt score",
        prompt: `Identify technical debt and code smells in ${targetName}`,
        icon: AlertTriangle,
        color: "text-[#cca700] bg-[#cca700]/10 border-[#cca700]/30 hover:border-[#cca700]",
      },
      {
        title: "Security & Secret Scan",
        desc: "Audit codebase for hardcoded credentials and security vulnerabilities",
        prompt: `Scan ${targetName} for hardcoded credentials and security issues`,
        icon: ShieldCheck,
        color: "text-[#f14c4c] bg-[#f14c4c]/10 border-[#f14c4c]/30 hover:border-[#f14c4c]",
      },
      {
        title: "Diagnose CI Failures",
        desc: "Isolate failing workflow steps and analyze error logs",
        prompt: `Analyze failing CI workflow runs in ${targetName}`,
        icon: FileSearch,
        color: "text-[#3794ff] bg-[#3794ff]/10 border-[#3794ff]/30 hover:border-[#3794ff]",
      },
    ],
    execute: [
      {
        title: "Autonomous Code Fix",
        desc: "Implement fixes in isolated Git worktree and verify tests (Requires Approval)",
        prompt: `Investigate and fix failing tests or bugs in ${targetName}`,
        icon: Terminal,
        color: "text-[#cca700] bg-[#cca700]/10 border-[#cca700]/30 hover:border-[#cca700]",
      },
      {
        title: "Create Feature Branch",
        desc: "Create and checkout an isolated local git branch (Requires Approval)",
        prompt: `Create a new feature branch in ${targetName}`,
        icon: GitBranch,
        color: "text-[#3794ff] bg-[#3794ff]/10 border-[#3794ff]/30 hover:border-[#3794ff]",
      },
      {
        title: "Generate Unit Tests",
        desc: "Synthesize automated test suite adhering to repo conventions",
        prompt: `Generate automated tests for key modules in ${targetName}`,
        icon: Code2,
        color: "text-[#4ec9b0] bg-[#4ec9b0]/10 border-[#4ec9b0]/30 hover:border-[#4ec9b0]",
      },
      {
        title: "Prepare Release Summary",
        desc: "Compile merged PRs and commit history into release changelog",
        prompt: `Prepare release summary and changelog for ${targetName}`,
        icon: FileText,
        color: "text-[#c586c0] bg-[#c586c0]/10 border-[#c586c0]/30 hover:border-[#c586c0]",
      },
    ],
  };

  const currentCards = starterCardsByMode[activeMode];

  const modePlaceholders: Record<OperatingMode, string> = {
    ask: `Ask anything about ${activeRepo || "repository"} (e.g. 'Show open issues', 'Overview of project', 'Recent commits')...`,
    analyze: `Analyze ${activeRepo || "codebase"} (e.g. 'Explain architecture', 'Identify technical debt', 'Scan secrets')...`,
    execute: `Instruct autonomous changes in ${activeRepo || "worktree"} (e.g. 'Fix bug in issue #42', 'Create feature branch')...`,
  };

  const messages = activeConversation?.messages || [];
  const hasMessages = messages.length > 0;
  const conversationTitle = activeConversation
    ? activeConversation.title.startsWith("Chat on ")
      ? "Workspace Session"
      : activeConversation.title
    : "Workspace Session";

  return (
    <div className="flex-1 flex flex-col h-full bg-[#181818] overflow-hidden font-sans">
      {/* Conversation Subheader */}
      <div className="px-4 py-2.5 bg-[#1f1f1f] border-b border-[#333333] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2.5 min-w-0">
          <span className="font-semibold text-white text-sm tracking-tight truncate max-w-[180px] sm:max-w-none">
            {conversationTitle}
          </span>
          <span className="text-[#858585] hidden sm:inline">/</span>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#252526] text-xs text-[#cccccc] border border-[#333333] truncate">
            <FolderGit2 className="h-3.5 w-3.5 text-[#3794ff] shrink-0" />
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
          <div className="flex items-center space-x-1.5 text-xs text-[#73c991] bg-[#73c991]/10 border border-[#73c991]/30 px-2.5 py-1 rounded shrink-0">
            <Shield className="h-3 w-3 text-[#73c991] shrink-0" />
            <span className="hidden sm:inline font-medium">Cryptographic HITL Enforced</span>
            <span className="sm:hidden font-medium">HITL</span>
          </div>
        </div>
      </div>

      {/* Plan Visualizer (if active) */}
      {currentPlan.length > 0 && (
        <div className="bg-[#1f1f1f] border-b border-[#333333] px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs animate-slide-up">
          <div className="flex items-center space-x-1.5 font-semibold text-[#3794ff] shrink-0 text-xs">
            <ListOrdered className="h-3.5 w-3.5" />
            <span>Agent Plan:</span>
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto w-full py-0.5 text-[#858585]">
            {currentPlan.map((step, idx) => {
              const cleanStep = step.replace(/^\d+[\.\)]\s*/, "");
              return (
                <div
                  key={idx}
                  className="whitespace-nowrap bg-[#252526] px-2.5 py-1 rounded border border-[#333333] text-xs flex items-center space-x-1.5 shrink-0"
                >
                  <span className="text-[#3794ff] font-bold font-mono">{idx + 1}.</span>
                  <span className="text-[#cccccc]">{cleanStep}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Message List / Starter Screen */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-5 space-y-4 bg-[#181818]" role="log" aria-live="polite">
        <div className="max-w-4xl mx-auto space-y-4">
          {!hasMessages ? (
            /* Empty State: Quick Action Starter Cards */
            <div className="py-6 sm:py-10 animate-fade-in space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#007acc]/15 border border-[#007acc]/30 text-[#3794ff] text-xs font-medium mb-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Agent ready for instructions</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  How can I assist with <span className="text-[#3794ff] font-mono">{activeRepo || "your code"}</span>?
                </h2>
                <p className="text-sm text-[#858585] max-w-lg mx-auto leading-relaxed">
                  Select an autonomous workflow below or enter your technical prompt to get started.
                </p>
              </div>

              {/* 3 Major Operating Modes Toggle */}
              <div className="flex items-center justify-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveMode("ask")}
                  className={`px-3.5 py-1.5 rounded text-xs font-medium transition-all cursor-pointer flex items-center space-x-1.5 ${
                    activeMode === "ask"
                      ? "bg-[#007acc] text-white shadow-sm"
                      : "bg-[#252526] text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e] border border-[#333333]"
                  }`}
                >
                  <FolderGit2 className="h-3.5 w-3.5" />
                  <span>Ask (Read-Only)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode("analyze")}
                  className={`px-3.5 py-1.5 rounded text-xs font-medium transition-all cursor-pointer flex items-center space-x-1.5 ${
                    activeMode === "analyze"
                      ? "bg-[#4ec9b0] text-black font-semibold shadow-sm"
                      : "bg-[#252526] text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e] border border-[#333333]"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Analyze (Deep Audit)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode("execute")}
                  className={`px-3.5 py-1.5 rounded text-xs font-medium transition-all cursor-pointer flex items-center space-x-1.5 ${
                    activeMode === "execute"
                      ? "bg-[#cca700] text-black font-semibold shadow-sm"
                      : "bg-[#252526] text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e] border border-[#333333]"
                  }`}
                >
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Execute (HITL Approved)</span>
                </button>
              </div>

              {/* 4 Enterprise Starter Cards (VS Code Syntax Style) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {currentCards.map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => handleQuickPrompt(card.prompt)}
                      disabled={isSending}
                      className={`flex items-start space-x-3.5 p-4 rounded-md bg-[#252526] hover:bg-[#2a2d2e] border border-[#333333] ${card.color.split(" ").slice(-1)[0]} text-left transition-all group cursor-pointer shadow-sm`}
                    >
                      <div className={`p-2 rounded border ${card.color.split(" ").slice(0, 3).join(" ")} shrink-0 transition-transform group-hover:scale-105`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm text-white group-hover:text-[#3794ff] transition-colors block">
                          {card.title}
                        </span>
                        <p className="text-xs text-[#858585] mt-1 line-clamp-2 leading-relaxed">
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
              className="flex items-center space-x-3 text-sm py-2.5 px-4 rounded-md bg-[#252526] border border-[#007acc]/50 max-w-md animate-pulse shadow-md font-medium text-[#cccccc]"
              role="status"
            >
              <Loader2 className="h-4 w-4 animate-spin text-[#3794ff] shrink-0" />
              <span>
                {streamingStatus || "Agent is synthesizing execution plan..."}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Bar & Controls */}
      <div className="p-3 sm:p-4 border-t border-[#333333] bg-[#1f1f1f]">
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Quick Toolbar: Mode Selector, Model Selector & Repository Scope */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#858585] px-1">
            <div className="flex items-center space-x-2">
              <span className="text-[#858585] hidden sm:inline">Engine:</span>
              <ModelDropdown compact align="left" direction="up" />
              <div className="hidden sm:flex items-center space-x-1 pl-2 border-l border-[#333333]">
                <button
                  type="button"
                  onClick={() => setActiveMode("ask")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                    activeMode === "ask" ? "bg-[#007acc] text-white" : "text-[#858585] hover:text-[#cccccc]"
                  }`}
                >
                  Ask
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode("analyze")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                    activeMode === "analyze" ? "bg-[#4ec9b0] text-black font-semibold" : "text-[#858585] hover:text-[#cccccc]"
                  }`}
                >
                  Analyze
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode("execute")}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                    activeMode === "execute" ? "bg-[#cca700] text-black font-semibold" : "text-[#858585] hover:text-[#cccccc]"
                  }`}
                >
                  Execute
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-[#858585]">
              <FolderGit2 className="h-3.5 w-3.5 text-[#3794ff] shrink-0" />
              <span>
                Scoped to: <strong className="text-white font-mono">{activeRepo || "global"}</strong>
              </span>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-end space-x-2"
            aria-label="Message input form"
          >
            <div className="flex-1 rounded-md border border-[#3c3c3c] bg-[#1e1e1e] focus-within:border-[#007acc] focus-within:ring-1 focus-within:ring-[#007acc] transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Instruction input"
                placeholder={modePlaceholders[activeMode]}
                rows={2}
                className="w-full resize-none bg-transparent p-3 text-sm text-white placeholder:text-[#858585] focus:outline-none leading-relaxed font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isSending}
              aria-label="Send instruction"
              className="h-11 px-4 bg-[#007acc] hover:bg-[#0e639c] text-white font-medium rounded-md text-sm flex items-center space-x-2 transition-all shadow-md disabled:opacity-40 disabled:pointer-events-none shrink-0 cursor-pointer"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>Send</span>
            </button>
          </form>

          <div className="text-[11px] text-center text-[#858585] flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 pt-0.5">
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
