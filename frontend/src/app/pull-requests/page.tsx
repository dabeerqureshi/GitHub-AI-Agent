"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GitPullRequest,
  Search,
  Sparkles,
  GitBranch,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useChatStore } from "@/store/use-chat-store";

export default function PullRequestsPage() {
  const router = useRouter();
  const { activeRepo, sendUserMessage, startNewConversation } = useChatStore();
  const [filter, setFilter] = useState("OPEN");
  const [search, setSearch] = useState("");

  const handleAiReview = (prTitle: string, prNum: number) => {
    startNewConversation(`PR Review #${prNum}`);
    sendUserMessage(`Conduct automated diff analysis and security review for PR #${prNum} (${prTitle}) in ${activeRepo || "the repository"}`);
    router.push("/chat");
  };

  const samplePRs = [
    {
      number: 88,
      title: "Hardened model router with Gemini 3.8 Flash and auto-fallback",
      repo: activeRepo || "dabeerqureshi/GitHub-AI-Agent",
      author: "dabeerqureshi",
      branch: "feat/gemini-3.8-flash",
      target: "main",
      status: "OPEN",
      ci_status: "SUCCESS",
      changed_files: 4,
      updated_at: "1 hour ago",
    },
    {
      number: 86,
      title: "Enterprise Dark Design System and Three-Panel AI Workspace",
      repo: activeRepo || "dabeerqureshi/GitHub-AI-Agent",
      author: "dabeerqureshi",
      branch: "ui/enterprise-redesign",
      target: "main",
      status: "OPEN",
      ci_status: "SUCCESS",
      changed_files: 12,
      updated_at: "3 hours ago",
    },
    {
      number: 84,
      title: "Implement fine-grained PAT repository discovery and caching",
      repo: activeRepo || "dabeerqureshi/GitHub-AI-Agent",
      author: "dabeerqureshi",
      branch: "fix/pat-sync",
      target: "main",
      status: "MERGED",
      ci_status: "SUCCESS",
      changed_files: 3,
      updated_at: "2 days ago",
    },
  ];

  const filteredPRs = samplePRs.filter((pr) => {
    if (filter === "OPEN" && pr.status !== "OPEN") return false;
    if (filter === "MERGED" && pr.status !== "MERGED") return false;
    if (search && !pr.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <GitPullRequest className="h-6 w-6 text-sky-400" />
              <span>Pull Requests</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Automated diff analysis, security checks, and Human-In-The-Loop PR governance.
            </p>
          </div>

          <button
            onClick={() => {
              startNewConversation(`PR Triage: ${activeRepo || "Workspace"}`);
              sendUserMessage(`Review all pending pull requests and summarize diffs in ${activeRepo || "the repository"}`);
              router.push("/chat");
            }}
            className="self-start sm:self-auto inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Review All PRs</span>
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
              placeholder="Filter pull requests..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            {["OPEN", "MERGED", "ALL"].map((st) => (
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

        {/* Pull Requests List */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 divide-y divide-slate-800 shadow-sm overflow-hidden">
          {filteredPRs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 font-mono">
              No pull requests matching criteria.
            </div>
          ) : (
            filteredPRs.map((pr) => (
              <div
                key={pr.number}
                className="p-4 sm:p-5 hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-3.5 min-w-0">
                  <GitPullRequest
                    className={`h-5 w-5 shrink-0 mt-0.5 ${
                      pr.status === "OPEN" ? "text-emerald-400" : "text-purple-400"
                    }`}
                  />
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-white hover:text-indigo-400 transition-colors cursor-pointer">
                        {pr.title}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase ${
                          pr.status === "OPEN"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-purple-500/15 text-purple-300 border-purple-500/30"
                        }`}
                      >
                        {pr.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                      <span>#{pr.number} by @{pr.author}</span>
                      <div className="flex items-center space-x-1">
                        <GitBranch className="h-3 w-3 text-slate-500" />
                        <span className="text-slate-300">{pr.branch}</span>
                        <span>→</span>
                        <span>{pr.target}</span>
                      </div>
                      <span>Updated {pr.updated_at}</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> CI Passed
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
                  <button
                    onClick={() => handleAiReview(pr.title, pr.number)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer shadow-sm"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                    <span>AI Review Diff</span>
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
