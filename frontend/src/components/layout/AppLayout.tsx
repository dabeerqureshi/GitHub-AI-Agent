"use client";

import React, { useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { GitHubAuthModal } from "@/components/auth/GitHubAuthModal";
import { ModelSelectorModal } from "@/components/models/ModelSelectorModal";
import { useChatStore } from "@/store/use-chat-store";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const {
    loadAuthStatus,
    loadRepositories,
    loadModelsConfig,
    loadConversations,
  } = useChatStore();

  useEffect(() => {
    loadAuthStatus();
    loadRepositories();
    loadModelsConfig();
    loadConversations();
  }, [loadAuthStatus, loadRepositories, loadModelsConfig, loadConversations]);

  return (
    <div className="min-h-screen flex flex-col bg-[#181818] text-[#cccccc] antialiased selection:bg-[#007acc]/35 selection:text-white">
      {/* VS Code Dark+ Responsive SaaS Web Navbar with Clean 2-Tier Architecture */}
      <Navbar />

      {/* Main Responsive Content Viewport */}
      <main className="flex-1 flex flex-col h-[calc(100vh-5.75rem)] w-full overflow-y-auto relative bg-[#181818]">
        {children}
      </main>

      {/* Global Modals */}
      <GitHubAuthModal />
      <ModelSelectorModal />
    </div>
  );
}
