"use client";

import React, { useState } from "react";
import {
  Settings,
  Moon,
  Globe,
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
      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
        {/* Page Header */}
        <div className="pb-5 border-b border-slate-800">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-indigo-400" />
            <span>General Settings</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Configure default workspace preferences, appearance, and notifications.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Appearance */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Moon className="h-4 w-4 text-indigo-400" />
              <span>Appearance &amp; Theme</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border-2 border-indigo-500/80 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Enterprise Dark (Default)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Deep Slate &amp; Precision Indigo theme</div>
                </div>
                <Check className="h-4 w-4 text-indigo-400 shrink-0" />
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 opacity-60 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Light Mode (Preview)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">High-contrast light developer theme</div>
                </div>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Globe className="h-4 w-4 text-indigo-400" />
              <span>Workspace Defaults</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Default Repository Scope</label>
                <input
                  type="text"
                  readOnly
                  value={activeRepo || "dabeerqureshi/GitHub-AI-Agent"}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1.5 font-medium">Auto-scroll Chat Generation</label>
                <label className="flex items-center space-x-2.5 text-white cursor-pointer select-none">
                  <input type="checkbox" defaultChecked className="rounded accent-indigo-600 h-4 w-4" />
                  <span className="text-xs text-slate-300">Smooth scroll to bottom as streaming responses arrive</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            {saved && (
              <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                <Check className="h-3.5 w-3.5" />
                <span>Preferences saved</span>
              </span>
            )}
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
