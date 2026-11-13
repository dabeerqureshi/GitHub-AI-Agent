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
  CheckCircle2,
  Layers,
  ArrowRight,
  FolderGit2,
} from "lucide-react";
import { useChatStore } from "@/store/use-chat-store";
import { MessageItem } from "@/components/chat/MessageItem";
import { ApprovalCard } from "@/components/approvals/ApprovalCard";

export function ChatContainer() {
  const {
    activeConversation,
    activeRepo,
    pendingApprovals,
    isSending,
    currentPlan,
    streamingStatus,
    sendUserMessage,
  } = useChatStore();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const starterCards = [
    {
      title: "Architecture Summary",
      desc: "Analyze tree, modules, dependencies & design patterns",
      prompt: `Explain architecture of ${activeRepo}`,
      icon: Layers,
    },
    {
      title: "Inspect Issues & Bugs",
      desc: "Search and categorize open defects and backlog",
      prompt: `Find open issues and bug reports in ${activeRepo}`,
      icon: Bug,
    },
    {
      title: "Review Pull Requests",
      desc: "Conduct automated diff analysis and security review",
      prompt: `Review recent pull requests and diffs in ${activeRepo}`,
      icon: GitPullRequest,
    },
    {
      title: "Diagnose CI Failures",
      desc: "Isolate failing workflow steps and synthesize fixes",
      prompt: `Analyze failing CI workflow runs in ${activeRepo}`,
      icon: FileSearch,
    },
  ];

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-lg mb-4 animate-pulse-slow">
          <Sparkles className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-bold text-foreground tracking-tight">GitHub AI Workspace</h3>
        <p className="text-xs md:text-sm max-w-md text-muted-foreground mt-2 leading-relaxed">
          Autonomous developer agent powered by hybrid model routing, Model Context Protocol (MCP),
          and strict Human-In-The-Loop cryptographic approvals.
        </p>
        <div className="mt-6 flex items-center space-x-2 text-xs font-mono text-muted-foreground bg-secondary/40 px-3.5 py-1.5 rounded-full border border-border">
          <FolderGit2 className="h-3.5 w-3.5 text-primary" />
          <span>Active Target:</span>
          <span className="font-semibold text-foreground">{activeRepo}</span>
        </div>
      </div>
    );
  }

  const hasMessages = activeConversation.messages.length > 0;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-53px)] bg-background">
      {/* Conversation Subheader */}
      <div className="px-6 py-2.5 glass-panel border-b border-border/60 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-foreground text-sm tracking-tight">
            {activeConversation.title}
          </span>
          <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-secondary/60 text-[11px] font-mono text-muted-foreground border border-border/60">
            <FolderGit2 className="h-3 w-3 text-primary" />
            <span className="text-foreground font-medium">{activeRepo}</span>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
          <Shield className="h-3 w-3 text-emerald-400" />
          <span>Cryptographic HITL Enforced</span>
        </div>
      </div>

      {/* Plan Visualizer (if active) */}
      {currentPlan.length > 0 && (
        <div className="bg-secondary/30 border-b border-border/60 px-6 py-2 flex items-center space-x-3 text-xs animate-slide-up">
          <div className="flex items-center space-x-1.5 font-semibold text-primary shrink-0">
            <ListOrdered className="h-3.5 w-3.5" />
            <span>Agent Plan:</span>
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto text-muted-foreground font-mono">
            {currentPlan.map((step, idx) => (
              <span
                key={idx}
                className="whitespace-nowrap bg-background/80 px-2.5 py-0.5 rounded-md border border-border/80 text-[11px] flex items-center space-x-1"
              >
                <span className="text-primary font-bold">{idx + 1}.</span>
                <span>{step}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Message List / Starter Screen */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3" role="log" aria-live="polite">
        {!hasMessages ? (
          /* Empty State: Quick Action Starter Cards */
          <div className="max-w-3xl mx-auto py-8 animate-fade-in space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-medium mb-2">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Ready for instructions</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                How can I assist with <span className="text-primary font-mono">{activeRepo}</span>?
              </h2>
              <p className="text-xs text-muted-foreground max-w-lg mx-auto">
                Select a high-leverage workflow below or enter any natural language instruction.
              </p>
            </div>

            {/* 4 Enterprise Starter Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {starterCards.map((card, i) => {
                const Icon = card.icon;
                return (
                  <button
                    key={i}
                    onClick={() => handleQuickPrompt(card.prompt)}
                    disabled={isSending}
                    className="flex items-start space-x-3.5 p-4 rounded-2xl glass-panel border border-border/80 text-left hover:border-primary/40 hover:bg-secondary/40 transition-all glow-hover group cursor-pointer"
                  >
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-105 transition-transform">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                          {card.title}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
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
          activeConversation.messages.map((msg) => (
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
            className="flex items-center space-x-3 text-muted-foreground text-xs py-3 px-4 rounded-xl bg-secondary/30 border border-border/60 max-w-md animate-pulse"
            role="status"
          >
            <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
            <span className="font-mono text-[11px]">
              {streamingStatus || "Agent is synthesizing execution plan..."}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-border/60 glass-panel">
        <form
          onSubmit={handleSubmit}
          className="flex items-end space-x-3 max-w-4xl mx-auto"
          aria-label="Message input form"
        >
          <div className="flex-1 rounded-2xl border border-border/80 bg-secondary/50 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all shadow-inner">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Instruction input"
              placeholder={`Instruct agent on ${activeRepo} (e.g. 'Explain architecture', 'Check failing tests', 'Create issue for memory leak')...`}
              rows={2}
              className="w-full resize-none bg-transparent p-3 text-xs md:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || isSending}
            aria-label="Send instruction"
            className="h-11 px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-2xl text-xs md:text-sm flex items-center space-x-1.5 transition-all shadow-md shadow-primary/20 disabled:opacity-40 disabled:pointer-events-none shrink-0 cursor-pointer"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>Send</span>
          </button>
        </form>
        <div className="text-[10px] text-center text-muted-foreground/70 mt-2 font-mono">
          Enter to send • Shift+Enter for new line • Scoped to {activeRepo}
        </div>
      </div>
    </div>
  );
}
