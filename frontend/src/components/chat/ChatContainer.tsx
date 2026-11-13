"use client";

import React, { useEffect, useRef, useState } from "react";
import { Send, Loader2, Sparkles, Shield, ListOrdered } from "lucide-react";
import { useChatStore } from "@/store/use-chat-store";
import { MessageItem } from "@/components/chat/MessageItem";
import { ApprovalCard } from "@/components/approvals/ApprovalCard";

export function ChatContainer() {
  const {
    activeConversation,
    pendingApprovals,
    isSending,
    currentPlan,
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

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
        <Sparkles className="h-10 w-10 text-primary/40 mb-3" />
        <h3 className="text-lg font-semibold text-foreground">Welcome to GitHub AI Workspace</h3>
        <p className="text-sm max-w-md text-center mt-1">
          Select an existing session from the sidebar or start a new session to interact with your
          GitHub repositories, issues, PRs, and local Git operations.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-57px)] bg-background">
      {/* Conversation Header */}
      <div className="px-6 py-3 border-b bg-card flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-foreground">{activeConversation.title}</span>
          {activeConversation.active_repo && (
            <span className="px-2 py-0.5 rounded bg-muted font-mono text-[11px] text-muted-foreground border">
              {activeConversation.active_repo}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1.5 text-muted-foreground font-mono">
          <Shield className="h-3.5 w-3.5 text-emerald-500" />
          <span>HITL Security Enabled</span>
        </div>
      </div>

      {/* Plan Visualizer (if active) */}
      {currentPlan.length > 0 && (
        <div className="bg-muted/40 border-b px-6 py-2.5 flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1 font-semibold text-primary shrink-0">
            <ListOrdered className="h-3.5 w-3.5" />
            <span>Agent Plan:</span>
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto text-muted-foreground font-mono">
            {currentPlan.map((step, idx) => (
              <span key={idx} className="whitespace-nowrap bg-background/80 px-2 py-0.5 rounded border text-[11px]">
                {step}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {activeConversation.messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}

        {/* Pending Approval Cards */}
        {pendingApprovals.map((approval) => (
          <ApprovalCard key={approval.id} approval={approval} />
        ))}

        {/* Loading Indicator */}
        {isSending && (
          <div className="flex items-center space-x-2 text-muted-foreground text-xs py-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Agent is executing instructions and verifying GitHub state...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 border-t bg-card">
        <form onSubmit={handleSubmit} className="flex items-end space-x-3 max-w-5xl mx-auto">
          <div className="flex-1 rounded-lg border bg-background focus-within:ring-1 focus-within:ring-primary">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Give natural language instructions, e.g. 'List my repositories', 'Create issue for auth bug', 'Inspect README.md'..."
              rows={2}
              className="w-full resize-none bg-transparent p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-lg text-sm flex items-center space-x-1.5 transition-colors disabled:opacity-40 shrink-0"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span>Send</span>
          </button>
        </form>
        <div className="text-[10px] text-center text-muted-foreground mt-2 font-mono">
          Enter to send • Shift+Enter for new line • All write actions require cryptographic human approval
        </div>
      </div>
    </div>
  );
}
