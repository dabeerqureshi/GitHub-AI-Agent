"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CircleDot,
  Search,
  Filter,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Bug,
  Tag,
  CheckCircle2,
  Clock,
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
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#2b2b2b] gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#ffffff] flex items-center gap-2">
              <CircleDot className="h-6 w-6 text-emerald-400" />
              <span>Issues</span>
            </h1>
            <p className="text-xs text-[#8c8c8c] mt-0.5">
              Track defects, triage backlogs, and investigate root causes using autonomous agents.
            </p>
          </div>

          <button
            onClick={() => handleAiAction(`Find and analyze open issues in ${activeRepo || "the repository"}`)}
            className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-[#007acc] hover:bg-[#007acc]/90 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Triage Open Issues</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8c8c8c]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search issues by title..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#252526] border border-[#2b2b2b] rounded-md text-[#ffffff] placeholder:text-[#8c8c8c] focus:outline-none focus:border-[#007acc]"
            />
          </div>

          <div className="flex items-center space-x-2">
            {["ALL", "OPEN", "CLOSED"].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors ${
                  filter === st
                    ? "bg-[#2a2d2e] text-[#ffffff] font-semibold border border-[#007acc]/40"
                    : "bg-[#1e1e1e] text-[#8c8c8c] hover:text-[#ffffff] border border-[#2b2b2b]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Issue Table */}
        <div className="rounded-md bg-[#252526] overflow-hidden border border-[#2b2b2b]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1e1e1e] text-[#8c8c8c] font-mono border-b border-[#2b2b2b]">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">Title</th>
                  <th className="p-3.5">Repository</th>
                  <th className="p-3.5">Labels</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Agent Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2b2b2b]">
                {filteredIssues.map((issue) => (
                  <tr key={issue.number} className="hover:bg-[#2a2d2e]/50 transition-colors">
                    <td className="p-3.5 font-mono text-[#007acc]">#{issue.number}</td>
                    <td className="p-3.5 font-medium text-[#ffffff]">
                      <div className="max-w-md truncate">{issue.title}</div>
                      <div className="text-[10px] text-[#8c8c8c] font-mono mt-0.5">
                        opened {issue.created_at} by {issue.author}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-[#8c8c8c]">{issue.repo}</td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {issue.labels.map((lbl) => (
                          <span
                            key={lbl}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#1e1e1e] border border-[#2b2b2b] text-[#8c8c8c]"
                          >
                            {lbl}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          issue.status === "OPEN"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-[#2a2d2e] text-[#8c8c8c] border-[#2b2b2b]"
                        }`}
                      >
                        {issue.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleAiAction(`Investigate issue #${issue.number}: ${issue.title} in ${issue.repo}`)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded-md bg-[#252526] hover:bg-[#2a2d2e] text-[#007acc] border border-indigo-500/30 transition-colors cursor-pointer"
                      >
                        <Bug className="h-3 w-3" />
                        <span>Diagnose Bug</span>
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
