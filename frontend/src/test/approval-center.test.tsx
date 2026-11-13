import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ApprovalCenter } from "../components/approvals/ApprovalCenter";
import * as api from "../lib/api";

const mockApprovals: api.ApprovalRequest[] = [
  {
    id: "app-pending-1",
    conversation_id: "conv-1",
    step_id: "step-1",
    tool_name: "create_pull_request",
    repo_name: "facebook/react",
    action_hash: "1122334455667788990011223344556677889900112233445566778899001122",
    execution_nonce: "nonce-101",
    description: "Open PR for memory fix",
    payload: { title: "Fix leak", head: "fix/leak" },
    status: "PENDING",
    is_executed: false,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  },
  {
    id: "app-executed-2",
    conversation_id: "conv-2",
    step_id: "step-2",
    tool_name: "merge_pull_request",
    repo_name: "facebook/react",
    action_hash: "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899",
    execution_nonce: "nonce-102",
    description: "Merge PR #42",
    payload: { pr_number: 42 },
    status: "APPROVED",
    is_executed: true,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    resolved_at: new Date(Date.now() - 3500000).toISOString(),
  },
];

describe("ApprovalCenter Component", () => {
  beforeEach(() => {
    vi.spyOn(api, "fetchAllApprovals").mockResolvedValue(mockApprovals);
    vi.spyOn(api, "decideApproval").mockResolvedValue({
      ...mockApprovals[0],
      status: "APPROVED",
    });
  });

  it("renders approval list with tool names, descriptions, and nonce indicators", async () => {
    render(<ApprovalCenter />);

    await waitFor(() => {
      expect(screen.getByText("create_pull_request")).toBeInTheDocument();
      expect(screen.getByText("Open PR for memory fix")).toBeInTheDocument();
      expect(screen.getByText("merge_pull_request")).toBeInTheDocument();
      expect(screen.getByText("✓ EXECUTED")).toBeInTheDocument();
    });
  });

  it("handles approve and execute click", async () => {
    render(<ApprovalCenter />);

    await waitFor(() => {
      expect(screen.getByText("Approve & Execute")).toBeInTheDocument();
    });

    const approveBtn = screen.getByText("Approve & Execute");
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(api.decideApproval).toHaveBeenCalledWith(
        "app-pending-1",
        expect.objectContaining({
          decision: "APPROVE",
          action_hash: mockApprovals[0].action_hash,
        })
      );
    });
  });
});
