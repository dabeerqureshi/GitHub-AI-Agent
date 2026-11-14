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
    <div className="my-2.5 rounded border border-amber-500/40 bg-[#252526] p-3 shadow-md font-mono">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <ShieldAlert className="h-4 w-4 shrink-0" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-white">
              Approval Required: <span className="font-mono text-[#007acc] font-bold">{approval.tool_name}</span>
            </h4>
            <p className="text-[11px] text-[#858585] mt-0.5">{approval.description}</p>
          </div>
        </div>
        <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30 shrink-0">
          Pending
        </span>
      </div>

      {/* Action Hash Badge */}
      <div className="mt-2.5 flex items-center space-x-1.5 bg-[#1e1e1e] px-2 py-1 rounded text-[10px] font-mono text-[#858585] border border-[#3c3c3c]">
        <Hash className="h-3 w-3 shrink-0 text-[#007acc]" />
        <span className="font-semibold text-white">Signature:</span>
        <span className="truncate font-tabular">{approval.action_hash}</span>
      </div>

      {/* Code Diff Viewer if patch is present */}
      {(approval.payload?.structured_diff || approval.payload?.diff) && (
        <div className="mt-2.5">
          <DiffViewer
            structuredDiff={approval.payload.structured_diff}
            rawDiff={approval.payload.diff}
          />
        </div>
      )}

      {/* Payload Inspector Accordion */}
      <div className="mt-2">
        <button
          onClick={() => setShowPayload(!showPayload)}
          className="flex items-center text-[10px] text-[#858585] hover:text-[#cccccc] font-medium cursor-pointer"
        >
          <span>{showPayload ? "Hide Action Parameters" : "Inspect Action Parameters"}</span>
          {showPayload ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
        </button>

        {showPayload && (
          <pre className="mt-1.5 text-[10px] font-mono p-2 bg-[#1e1e1e] rounded border border-[#3c3c3c] overflow-x-auto text-[#cccccc] max-h-40">
            {JSON.stringify(approval.payload, null, 2)}
          </pre>
        )}
      </div>

      {/* Reviewer Note Input */}
      <div className="mt-2">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional reviewer notes or instructions..."
          className="w-full text-xs px-2 py-1 rounded border border-[#3c3c3c] bg-[#1e1e1e] text-[#cccccc] placeholder:text-[#858585] focus:outline-none focus:border-[#007acc] font-mono"
        />
      </div>

      {/* Action Controls */}
      <div className="mt-3 flex items-center justify-end space-x-2">
        <button
          onClick={onReject}
          disabled={isSending}
          className="flex items-center space-x-1 px-2.5 py-1 rounded border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-xs font-medium font-mono transition-colors disabled:opacity-40 cursor-pointer"
        >
          <X className="h-3 w-3" />
          <span>Reject</span>
        </button>
        <button
          onClick={onApprove}
          disabled={isSending}
          className="flex items-center space-x-1 px-3 py-1 rounded bg-[#007acc] hover:bg-[#0e639c] text-white text-xs font-medium font-mono transition-colors shadow-xs disabled:opacity-40 cursor-pointer"
        >
          <Check className="h-3 w-3" />
          <span>Approve & Execute</span>
        </button>
      </div>
    </div>
  );
}
