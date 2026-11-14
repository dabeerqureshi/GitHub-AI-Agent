"use client";

import React, { useState } from "react";
import { ShieldAlert, Check, X, Hash, ChevronDown, ChevronUp } from "lucide-react";
import { ApprovalRequest } from "@/lib/api";
import { useChatStore } from "@/store/use-chat-store";
import { DiffViewer } from "@/components/chat/DiffViewer";

interface ApprovalCardProps {
  approval: ApprovalRequest;
}

export function ApprovalCard({ approval }: ApprovalCardProps) {
  const { handleApprovalDecision, isSending } = useChatStore();
  const [showPayload, setShowPayload] = useState(false);
  const [notes, setNotes] = useState("");

  const onApprove = () => {
    handleApprovalDecision(approval.id, approval.action_hash, "APPROVE", notes || undefined);
  };

  const onReject = () => {
    handleApprovalDecision(approval.id, approval.action_hash, "REJECT", notes || undefined);
  };

  return (
    <div className="my-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-lg backdrop-blur-xs">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <ShieldAlert className="h-4 w-4 shrink-0" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              Approval Required: <span className="font-mono text-primary font-semibold">{approval.tool_name}</span>
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">{approval.description}</p>
          </div>
        </div>
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30 shadow-xs">
          Pending
        </span>
      </div>

      {/* Action Hash Badge */}
      <div className="mt-3 flex items-center space-x-1.5 bg-card/80 px-3 py-1.5 rounded-lg text-[11px] font-mono text-muted-foreground border border-border">
        <Hash className="h-3 w-3 shrink-0 text-primary" />
        <span className="font-semibold text-foreground">Signature:</span>
        <span className="truncate font-tabular">{approval.action_hash}</span>
      </div>

      {/* Code Diff Viewer if patch is present */}
      {(approval.payload?.structured_diff || approval.payload?.diff) && (
        <div className="mt-3">
          <DiffViewer
            structuredDiff={approval.payload.structured_diff}
            rawDiff={approval.payload.diff}
          />
        </div>
      )}

      {/* Payload Inspector Accordion */}
      <div className="mt-3">
        <button
          onClick={() => setShowPayload(!showPayload)}
          className="flex items-center text-xs text-muted-foreground hover:text-foreground font-medium"
        >
          <span>{showPayload ? "Hide Action Parameters" : "Inspect Action Parameters"}</span>
          {showPayload ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
        </button>

        {showPayload && (
          <pre className="mt-2 text-[11px] font-mono p-3 bg-background/80 rounded border overflow-x-auto text-foreground max-h-48">
            {JSON.stringify(approval.payload, null, 2)}
          </pre>
        )}
      </div>

      {/* Reviewer Note Input */}
      <div className="mt-3">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional reviewer notes or instructions..."
          className="w-full text-xs px-3 py-1.5 rounded border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Action Controls */}
      <div className="mt-4 flex items-center justify-end space-x-3">
        <button
          onClick={onReject}
          disabled={isSending}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md border border-destructive/50 text-destructive hover:bg-destructive/10 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
          <span>Reject</span>
        </button>
        <button
          onClick={onApprove}
          disabled={isSending}
          className="flex items-center space-x-1.5 px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          <span>Approve & Execute</span>
        </button>
      </div>
    </div>
  );
}
