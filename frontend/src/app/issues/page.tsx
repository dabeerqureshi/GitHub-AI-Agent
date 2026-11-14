"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CircleDot,
  Search,
  Sparkles,
  ChevronRight,
  Bug,
  CheckCircle2,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useChatStore } from "@/store/use-chat-store";

export default function IssuesPage() {
  const router = useRouter();
  const { activeRepo, sendUserMessage, startNewConversation } = useChatStore();
  const [filter, setFilter] = useState("OPEN");
  const [search, setSearch] = useState("");

  const handleAiAction = (actionPrompt: string) => {
    startNewConversation(`Issue Triage: ${activeRepo?.split("/").pop() || "Workspace"}`);
    sendUserMessage(actionPrompt);
    router.push("/chat");
  };

  const sampleIssues = [
    {
      number: 104,
      title: "Memory leak during concurrent SQLite write transactions",
      repo: activeRepo || "dabeerqureshi/GitHub-AI-Agent",
      author: "dabeerqureshi",
      labels: ["bug", "backend", "p1"],
      status: "OPEN",
      created_at: "2 hours ago",
    },
    {
      number: 102,
      title: "Model router should support automatic fallback on 404 deprecation",
      repo: activeRepo || "dabeerqureshi/GitHub-AI-Agent",
      author: "dabeerqureshi",
      labels: ["enhancement", "ai-engine"],
      status: "OPEN",
      created_at: "1 day ago",
    },
    {
      number: 98,
      title: "Add fine-grained PAT validation and accessible repository pagination",
      repo: activeRepo || "dabeerqureshi/GitHub-AI-Agent",
      author: "dabeerqureshi",
      labels: ["security", "github-api"],
      status: "CLOSED",
      created_at: "3 days ago",
    },
  ];

  const filteredIssues = sampleIssues.filter((iss) => {
    if (filter === "OPEN" && iss.status !== "OPEN") return false;
    if (filter === "CLOSED" && iss.status !== "CLOSED") return false;
    if (search && !iss.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <CircleDot className="h-6 w-6 text-emerald-400" />
              <span>Issues</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Track defects, triage backlogs, and investigate root causes using autonomous agents.
            </p>
          </div>

          <button
            onClick={() => handleAiAction(`Find and analyze open issues in ${activeRepo || "the repository"}`)}
            className="self-start sm:self-auto inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Triage Open Issues</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter issues..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            {["OPEN", "CLOSED", "ALL"].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  filter === st
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Issues List */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 divide-y divide-slate-800 shadow-sm overflow-hidden">
          {filteredIssues.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 font-mono">
              No issues matching criteria.
            </div>
          ) : (
            filteredIssues.map((iss) => (
              <div
                key={iss.number}
                className="p-4 sm:p-5 hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-3.5 min-w-0">
                  {iss.status === "OPEN" ? (
                    <CircleDot className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-white hover:text-indigo-400 transition-colors cursor-pointer">
                        {iss.title}
                      </span>
                      {iss.labels.map((lbl) => (
                        <span
                          key={lbl}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-slate-300 border border-slate-800"
                        >
                          {lbl}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      #{iss.number} opened {iss.created_at} by @{iss.author}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
                  <button
                    onClick={() => handleAiAction(`Investigate and propose a fix for issue #${iss.number}: "${iss.title}"`)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer shadow-sm"
                  >
                    <Bug className="h-3.5 w-3.5 text-indigo-400" />
                    <span>AI Investigate</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
