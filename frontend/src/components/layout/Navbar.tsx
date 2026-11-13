"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { GitBranch, ShieldCheck, Cpu, Database, CheckCircle2, AlertCircle } from "lucide-react";
import { fetchHealth } from "@/lib/api";
import { useChatStore } from "@/store/use-chat-store";

export function Navbar() {
  const { activeRepo, setActiveRepo } = useChatStore();
  const [health, setHealth] = useState<{ status: string; default_provider: string } | null>(null);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: "offline", default_provider: "ollama" }));
  }, []);

  return (
    <header className="border-b bg-card text-card-foreground px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <div className="flex items-center space-x-6">
        <Link href="/" className="flex items-center space-x-2 font-mono font-bold text-lg tracking-tight">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span>GitHub AI Workspace</span>
        </Link>
        <div className="flex items-center space-x-2 text-sm bg-muted/60 px-3 py-1.5 rounded-md border">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Active Repo:</span>
          <input
            type="text"
            value={activeRepo}
            onChange={(e) => setActiveRepo(e.target.value)}
            className="bg-transparent text-foreground font-mono text-xs focus:outline-none w-48 font-semibold"
            placeholder="owner/repository"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Status Indicators */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full border bg-background font-mono">
            <Cpu className="h-3.5 w-3.5 text-blue-400" />
            <span className="capitalize">{health?.default_provider || "Ollama"}</span>
          </div>

          <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full border bg-background font-mono">
            <Database className="h-3.5 w-3.5 text-emerald-400" />
            {health?.status === "ok" ? (
              <span className="flex items-center text-emerald-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Online
              </span>
            ) : (
              <span className="flex items-center text-amber-500">
                <AlertCircle className="h-3 w-3 mr-1" />
                Offline
              </span>
            )}
          </div>
        </div>

        <nav className="flex items-center space-x-3 text-xs font-medium">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Workspace
          </Link>
          <Link
            href="/approvals"
            className="px-3 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Approvals
          </Link>
          <Link
            href="/runs"
            className="px-3 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Runs & Timeline
          </Link>
          <Link
            href="/audit"
            className="px-3 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Audit Log
          </Link>
        </nav>
      </div>
    </header>
  );
}
