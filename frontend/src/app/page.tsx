"use client";

import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatContainer } from "@/components/chat/ChatContainer";

export default function WorkspacePage() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <Navbar />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <ChatContainer />
      </div>
    </div>
  );
}
