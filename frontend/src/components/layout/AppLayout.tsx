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
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Modern Responsive SaaS Web Navbar with Clean 2-Tier Architecture */}
      <Navbar />

      {/* Main Responsive Content Viewport */}
      <main className="flex-1 flex flex-col h-[calc(100vh-5.75rem)] w-full overflow-y-auto relative">
        {children}
      </main>

      {/* Global Modals */}
      <GitHubAuthModal />
      <ModelSelectorModal />
    </div>
  );
}
