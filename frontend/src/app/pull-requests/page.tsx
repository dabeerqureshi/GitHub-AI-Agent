"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GitPullRequest,
  Search,
  Filter,
  Sparkles,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
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
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#252D3A] gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
              <GitPullRequest className="h-6 w-6 text-[#38BDF8]" />
              <span>Pull Requests</span>
            </h1>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Automated diff analysis, security checks, and Human-In-The-Loop PR governance.
            </p>
          </div>

          <button
            onClick={() => {
              startNewConversation(`PR Triage: ${activeRepo || "Workspace"}`);
              sendUserMessage(`Review all pending pull requests and summarize diffs in ${activeRepo || "the repository"}`);
              router.push("/chat");
            }}
            className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#818CF8] hover:bg-[#818CF8]/90 text-[#090B10] text-xs font-semibold transition-colors cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Review All PRs</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#64748B]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pull requests..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#121722] border border-[#252D3A] rounded-md text-[#F1F5F9] placeholder:text-[#64748B] focus:outline-none focus:border-[#818CF8]"
            />
          </div>

          <div className="flex items-center space-x-2">
            {["ALL", "OPEN", "MERGED"].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors ${
                  filter === st
                    ? "bg-[#171E2B] text-[#F1F5F9] font-semibold border border-[#818CF8]/40"
                    : "bg-[#0D1017] text-[#64748B] hover:text-[#F1F5F9] border border-[#252D3A]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Pull Requests Table */}
        <div className="rounded-xl surface-card overflow-hidden border border-[#252D3A]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0D1017] text-[#64748B] font-mono border-b border-[#252D3A]">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">Pull Request</th>
                  <th className="p-3.5">Branches</th>
                  <th className="p-3.5">CI Check</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252D3A]">
                {filteredPRs.map((pr) => (
                  <tr key={pr.number} className="hover:bg-[#171E2B]/50 transition-colors">
                    <td className="p-3.5 font-mono text-[#38BDF8]">#{pr.number}</td>
                    <td className="p-3.5 font-medium text-[#F1F5F9]">
                      <div className="max-w-md truncate font-semibold">{pr.title}</div>
                      <div className="text-[10px] text-[#64748B] font-mono mt-0.5">
                        {pr.author} • {pr.changed_files} files changed • updated {pr.updated_at}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-[#94A3B8]">
                      <div className="flex items-center space-x-1">
                        <span>{pr.branch}</span>
                        <ArrowRight className="h-3 w-3 text-[#64748B]" />
                        <span className="text-[#F1F5F9]">{pr.target}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Passing</span>
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          pr.status === "OPEN"
                            ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                            : "bg-purple-500/15 text-purple-300 border-purple-500/30"
                        }`}
                      >
                        {pr.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleAiReview(pr.title, pr.number)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-[#121722] hover:bg-[#171E2B] text-[#818CF8] border border-indigo-500/30 transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="h-3 w-3" />
                        <span>AI Review</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
