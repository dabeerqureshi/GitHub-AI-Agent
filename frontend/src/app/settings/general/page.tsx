"use client";

import React, { useState } from "react";
import {
  Settings,
  Moon,
  Globe,
  Bell,
  Shield,
  Check,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useChatStore } from "@/store/use-chat-store";

export default function GeneralSettingsPage() {
  const { activeRepo } = useChatStore();
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Page Header */}
        <div className="pb-4 border-b border-[#252D3A]">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
            <Settings className="h-6 w-6 text-[#818CF8]" />
            <span>General Settings</span>
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Configure default workspace preferences, appearance, and notifications.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Appearance */}
          <div className="p-5 rounded-xl surface-card border border-[#252D3A] space-y-4">
            <h3 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
              <Moon className="h-4 w-4 text-[#818CF8]" />
              <span>Appearance & Theme</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#0D1017] border-2 border-[#818CF8] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#F1F5F9]">Enterprise Dark (Default)</div>
                  <div className="text-[11px] text-[#94A3B8]">Obsidian & Precision Indigo theme</div>
                </div>
                <Check className="h-4 w-4 text-[#818CF8]" />
              </div>
              <div className="p-3 rounded-lg bg-[#0D1017] border border-[#252D3A] opacity-60 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#F1F5F9]">Light Mode (Preview)</div>
                  <div className="text-[11px] text-[#94A3B8]">High-contrast light developer theme</div>
                </div>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="p-5 rounded-xl surface-card border border-[#252D3A] space-y-4">
            <h3 className="text-sm font-semibold text-[#F1F5F9] flex items-center gap-2">
              <Globe className="h-4 w-4 text-[#818CF8]" />
              <span>Workspace Defaults</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#94A3B8] mb-1 font-medium">Default Repository Scope</label>
                <input
                  type="text"
                  readOnly
                  value={activeRepo || "dabeerqureshi/GitHub-AI-Agent"}
                  className="w-full px-3 py-1.5 rounded-md bg-[#0D1017] border border-[#252D3A] text-[#F1F5F9] font-mono text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[#94A3B8] mb-1 font-medium">Auto-scroll Chat Generation</label>
                <div className="flex items-center space-x-2 text-[#F1F5F9]">
                  <input type="checkbox" defaultChecked className="rounded accent-[#818CF8]" />
                  <span>Smooth scroll to bottom as streaming responses arrive</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            {saved && (
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                <Check className="h-3 w-3" />
                <span>Preferences saved</span>
              </span>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-[#818CF8] hover:bg-[#818CF8]/90 text-[#090B10] font-semibold text-xs rounded-md transition-colors cursor-pointer"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
