"use client";

import React from "react";
import { User, Bot, CheckCircle } from "lucide-react";
import { ConversationMessage } from "@/lib/api";

interface MessageItemProps {
  message: ConversationMessage;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex items-start space-x-3 py-4 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 border border-primary/30 mt-0.5">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground font-medium rounded-tr-none shadow-sm"
            : "bg-card border text-card-foreground rounded-tl-none shadow-sm"
        }`}
      >
        {/* Assistant Header if tool verified */}
        {!isUser && message.content.includes("### Verified Operation") && (
          <div className="flex items-center space-x-1.5 text-xs text-emerald-500 font-semibold mb-2">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>GitHub Operation Verified</span>
          </div>
        )}

        <div className="whitespace-pre-wrap font-sans text-sm">{message.content}</div>

        <div
          className={`mt-1.5 text-[10px] text-right font-mono ${
            isUser ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {isUser && (
        <div className="h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shrink-0 border mt-0.5">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
