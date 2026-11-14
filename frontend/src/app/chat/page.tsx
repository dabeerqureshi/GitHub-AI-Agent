"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { ChatContextPanel } from "@/components/chat/ChatContextPanel";

export default function ChatPage() {
  return (
    <AppLayout>
      <div className="flex h-full overflow-hidden">
        {/* Left: Conversation History */}
        <Sidebar />

        {/* Center: AI Conversation Workspace */}
        <ChatContainer />

        {/* Right: Technical Context Panel */}
        <ChatContextPanel />
      </div>
    </AppLayout>
  );
}
