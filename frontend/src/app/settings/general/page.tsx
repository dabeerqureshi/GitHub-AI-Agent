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
        <div className="pb-4 border-b border-[#2b2b2b]">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#ffffff] flex items-center gap-2">
            <Settings className="h-6 w-6 text-[#007acc]" />
            <span>General Settings</span>
          </h1>
          <p className="text-xs text-[#8c8c8c] mt-0.5">
            Configure default workspace preferences, appearance, and notifications.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Appearance */}
          <div className="p-5 rounded-md bg-[#252526] border border-[#2b2b2b] space-y-4">
            <h3 className="text-sm font-semibold text-[#ffffff] flex items-center gap-2">
              <Moon className="h-4 w-4 text-[#007acc]" />
              <span>Appearance & Theme</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#1e1e1e] border-2 border-[#007acc] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#ffffff]">Enterprise Dark (Default)</div>
                  <div className="text-[11px] text-[#8c8c8c]">Obsidian & Precision Indigo theme</div>
                </div>
                <Check className="h-4 w-4 text-[#007acc]" />
              </div>
              <div className="p-3 rounded-lg bg-[#1e1e1e] border border-[#2b2b2b] opacity-60 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#ffffff]">Light Mode (Preview)</div>
                  <div className="text-[11px] text-[#8c8c8c]">High-contrast light developer theme</div>
                </div>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="p-5 rounded-md bg-[#252526] border border-[#2b2b2b] space-y-4">
            <h3 className="text-sm font-semibold text-[#ffffff] flex items-center gap-2">
              <Globe className="h-4 w-4 text-[#007acc]" />
              <span>Workspace Defaults</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#8c8c8c] mb-1 font-medium">Default Repository Scope</label>
                <input
                  type="text"
                  readOnly
                  value={activeRepo || "dabeerqureshi/GitHub-AI-Agent"}
                  className="w-full px-3 py-1.5 rounded-md bg-[#1e1e1e] border border-[#2b2b2b] text-[#ffffff] font-mono text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[#8c8c8c] mb-1 font-medium">Auto-scroll Chat Generation</label>
                <div className="flex items-center space-x-2 text-[#ffffff]">
                  <input type="checkbox" defaultChecked className="rounded accent-[#007acc]" />
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
              className="px-4 py-2 bg-[#007acc] hover:bg-[#007acc]/90 text-white font-semibold text-xs rounded-md transition-colors cursor-pointer"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
