"use client";

import React, { useEffect } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { GitHubAuthModal } from "@/components/auth/GitHubAuthModal";
import { ModelSelectorModal } from "@/components/models/ModelSelectorModal";
import { useChatStore } from "@/store/use-chat-store";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { loadAuthStatus, loadRepositories, loadModelsConfig } = useChatStore();

  useEffect(() => {
    loadAuthStatus();
    loadRepositories();
    loadModelsConfig();
  }, [loadAuthStatus, loadRepositories, loadModelsConfig]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090B10] text-[#F1F5F9]">
      {/* 3-Tier Left Navigation Sidebar */}
      <AppSidebar />

      {/* Main Body Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Global Top Navigation */}
        <AppHeader />

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto bg-[#090B10]">
          {children}
        </main>
      </div>

      {/* Global Modals */}
      <GitHubAuthModal />
      <ModelSelectorModal />
    </div>
  );
}
