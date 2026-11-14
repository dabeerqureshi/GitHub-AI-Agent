"use client";

import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { ChatContextPanel } from "@/components/chat/ChatContextPanel";

export default function WorkspacePage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#090B10] text-[#F1F5F9]">
      <Navbar />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <ChatContainer />
        <ChatContextPanel />
      </div>
    </div>
  );
}
