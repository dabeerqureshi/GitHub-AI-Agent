"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { ChatContextPanel } from "@/components/chat/ChatContextPanel";

export default function ChatPage() {
  return (
    <AppLayout>
      <div className="flex flex-1 w-full h-[calc(100vh-3.5rem)] overflow-hidden bg-slate-950">
        <Sidebar />
        <ChatContainer />
        <ChatContextPanel />
      </div>
    </AppLayout>
  );
}
