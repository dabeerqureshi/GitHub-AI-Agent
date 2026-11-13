"use client";

import React, { useState } from "react";
import { User, Bot, CheckCircle2, Copy, Check, Terminal, FileCode, Shield } from "lucide-react";
import { ConversationMessage } from "@/lib/api";

interface MessageItemProps {
  message: ConversationMessage;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isVerified =
    message.content.includes("### Verified Operation") ||
    message.content.includes("### Verified Facts");

  return (
    <div
      className={`flex items-start space-x-3 py-3 animate-slide-up ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && (
        <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-sm mt-0.5">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div
        className={`relative group max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed transition-all ${
          isUser
            ? "bg-primary text-primary-foreground font-medium rounded-tr-sm shadow-md"
            : "glass-panel border border-border/80 text-foreground rounded-tl-sm shadow-md"
        }`}
      >
        {/* Assistant Header if verified operation */}
        {!isUser && isVerified && (
          <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold mb-2.5 pb-2 border-b border-border/40">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-mono text-[11px] tracking-wide uppercase">
              Verified GitHub MCP Operation
            </span>
          </div>
        )}

        {/* Message Content */}
        <div className="whitespace-pre-wrap font-sans text-xs md:text-sm leading-relaxed">
          {message.content}
        </div>

        {/* Message Footer: Timestamp & Copy Action */}
        <div
          className={`flex items-center justify-between mt-2 pt-1.5 border-t text-[10px] font-mono ${
            isUser ? "border-primary-foreground/20 text-primary-foreground/70" : "border-border/40 text-muted-foreground"
          }`}
        >
          <span>
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>

          <button
            onClick={handleCopy}
            title="Copy message"
            className="flex items-center space-x-1 opacity-70 hover:opacity-100 transition-opacity ml-4 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isUser && (
        <div className="h-8 w-8 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center shrink-0 border border-border shadow-sm mt-0.5">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
