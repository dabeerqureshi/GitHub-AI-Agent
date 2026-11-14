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
  const { loadAuthStatus, loadRepositories, loadModelsConfig } = useChatStore();

  useEffect(() => {
    loadAuthStatus();
    loadRepositories();
    loadModelsConfig();
  }, [loadAuthStatus, loadRepositories, loadModelsConfig]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Modern Responsive SaaS Web Navbar with Integrated Model Dropdown */}
      <Navbar />

      {/* Main Responsive Content Viewport */}
      <main className="flex-1 flex flex-col min-h-0 w-full overflow-hidden relative">
        {children}
      </main>

      {/* Global Modals */}
      <GitHubAuthModal />
      <ModelSelectorModal />
    </div>
  );
}
