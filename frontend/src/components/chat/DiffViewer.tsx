"use client";

import React, { useState } from "react";
import { FileCode, Check, X, ChevronDown, ChevronRight, Plus, Minus } from "lucide-react";

export interface DiffFile {
  filename: string;
  status: "modified" | "added" | "deleted";
  additions: number;
  deletions: number;
  patch: string;
}

export interface StructuredDiff {
  summary: string;
  total_files: number;
  total_additions: number;
  total_deletions: number;
  files: DiffFile[];
  raw_diff?: string;
}

interface DiffViewerProps {
  structuredDiff?: StructuredDiff;
  rawDiff?: string;
  onApprove?: () => void;
  onReject?: () => void;
  isApproving?: boolean;
}

export function DiffViewer({
  structuredDiff,
  rawDiff,
  onApprove,
  onReject,
  isApproving = false,
}: DiffViewerProps) {
  // If structuredDiff is not provided, parse rawDiff
  const files: DiffFile[] = structuredDiff?.files || [];
  const totalAdditions = structuredDiff?.total_additions ?? 0;
  const totalDeletions = structuredDiff?.total_deletions ?? 0;
  const totalFiles = structuredDiff?.total_files ?? files.length;

  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>(() => {
    // Default: expand first file
    const initial: Record<string, boolean> = {};
    if (files.length > 0) initial[files[0].filename] = true;
    return initial;
  });

  const toggleFile = (filename: string) => {
    setExpandedFiles((prev) => ({ ...prev, [filename]: !prev[filename] }));
  };

  const renderDiffLines = (patch: string) => {
    return patch.split("\n").map((line, idx) => {
      let lineStyle = "text-muted-foreground";
      let bgStyle = "bg-transparent";

      if (line.startsWith("+") && !line.startsWith("+++")) {
        lineStyle = "text-emerald-400 font-medium";
        bgStyle = "bg-emerald-950/40 border-l-2 border-emerald-500";
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        lineStyle = "text-rose-400 font-medium";
        bgStyle = "bg-rose-950/40 border-l-2 border-rose-500";
      } else if (line.startsWith("@@")) {
        lineStyle = "text-cyan-400 font-mono font-semibold";
        bgStyle = "bg-cyan-950/30";
      }

      return (
        <div key={idx} className={`px-3 py-0.5 text-xs font-mono whitespace-pre flex ${bgStyle}`}>
          <span className="w-8 select-none text-[10px] text-muted-foreground/60 shrink-0 text-right pr-2">
            {idx + 1}
          </span>
          <span className={lineStyle}>{line}</span>
        </div>
      );
    });
  };

  return (
    <div className="my-3 rounded-lg border border-border bg-card overflow-hidden shadow-sm">
      {/* Header bar with metrics */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border">
        <div className="flex items-center space-x-2">
          <FileCode className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground">Code Changes Review</span>
          <span className="text-xs text-muted-foreground">({totalFiles} files)</span>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono font-medium">
          <span className="flex items-center text-emerald-500">
            <Plus className="h-3 w-3 mr-0.5" />
            {totalAdditions}
          </span>
          <span className="flex items-center text-rose-500">
            <Minus className="h-3 w-3 mr-0.5" />
            {totalDeletions}
          </span>
        </div>
      </div>

      {/* Per-File Diff Accordion */}
      {files.length > 0 ? (
        <div className="divide-y divide-border">
          {files.map((file) => {
            const isExpanded = expandedFiles[file.filename] ?? false;
            return (
              <div key={file.filename} className="bg-background/40">
                <button
                  onClick={() => toggleFile(file.filename)}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="flex items-center space-x-2">
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="text-xs font-mono font-semibold text-foreground">
                      {file.filename}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {file.status}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs font-mono">
                    <span className="text-emerald-500">+{file.additions}</span>
                    <span className="text-rose-500">-{file.deletions}</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="bg-zinc-950 py-2 overflow-x-auto border-t border-border">
                    {renderDiffLines(file.patch)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : rawDiff ? (
        <div className="bg-zinc-950 p-3 overflow-x-auto">
          {renderDiffLines(rawDiff)}
        </div>
      ) : (
        <div className="p-4 text-xs text-muted-foreground">No file changes detected.</div>
      )}

      {/* Approval Actions if provided */}
      {(onApprove || onReject) && (
        <div className="flex items-center justify-end space-x-3 px-4 py-3 bg-muted/40 border-t border-border">
          {onReject && (
            <button
              onClick={onReject}
              disabled={isApproving}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded border border-destructive/50 text-destructive hover:bg-destructive/10 text-xs font-semibold disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reject Patch</span>
            </button>
          )}
          {onApprove && (
            <button
              onClick={onApprove}
              disabled={isApproving}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50 shadow-sm"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Approve Changes & Open PR</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
