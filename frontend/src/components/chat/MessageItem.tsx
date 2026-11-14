"use client";

import React, { useState } from "react";
import { User, Bot, CheckCircle2, Copy, Check } from "lucide-react";
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
      className={`flex items-start space-x-3 py-2 animate-slide-up ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && (
        <div className="h-8 w-8 rounded-md bg-[#007acc]/15 text-[#3794ff] flex items-center justify-center shrink-0 border border-[#007acc]/30 shadow-xs mt-0.5">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div
        className={`relative group max-w-[94%] sm:max-w-[85%] md:max-w-[80%] rounded-md px-4 py-3 text-sm sm:text-base leading-relaxed transition-all ${
          isUser
            ? "bg-[#007acc] text-white font-normal shadow-sm"
            : "bg-[#252526] text-[#cccccc] border border-[#333333] shadow-sm"
        }`}
      >
        {/* Assistant Header if verified operation */}
        {!isUser && isVerified && (
          <div className="flex items-center space-x-2 text-xs text-[#73c991] font-semibold mb-2.5 pb-2 border-b border-[#333333]">
            <CheckCircle2 className="h-4 w-4 text-[#73c991]" />
            <span className="font-mono text-xs tracking-wider uppercase">
              Verified GitHub MCP Operation
            </span>
          </div>
        )}

        {/* Message Content: Clean Readable Typography */}
        <div className="whitespace-pre-wrap font-sans text-sm sm:text-base leading-relaxed break-words text-white">
          {message.content}
        </div>

        {/* Message Footer: Timestamp & Copy Action */}
        <div
          className={`flex items-center justify-between mt-3 pt-1.5 border-t text-xs ${
            isUser ? "border-white/20 text-white/80" : "border-[#333333] text-[#858585]"
          }`}
        >
          <span className="font-mono text-[11px]">
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>

          <button
            onClick={handleCopy}
            title="Copy message text"
            className="flex items-center space-x-1.5 opacity-80 hover:opacity-100 transition-opacity ml-4 cursor-pointer text-xs"
          >
            {copied ? (
              <>
                <Check className={`h-3.5 w-3.5 ${isUser ? "text-white" : "text-[#73c991]"}`} />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isUser && (
        <div className="h-8 w-8 rounded-md bg-[#252526] text-[#cccccc] flex items-center justify-center shrink-0 border border-[#333333] shadow-xs mt-0.5">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
