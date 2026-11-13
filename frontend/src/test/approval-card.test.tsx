import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ApprovalCard } from "../components/approvals/ApprovalCard";
import { ApprovalRequest } from "../lib/api";

const mockApproval: ApprovalRequest = {
  id: "app-123",
  conversation_id: "conv-1",
  step_id: "step-1",
  tool_name: "create_pull_request",
  action_hash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  description: "Create pull request on facebook/react",
  payload: { title: "Fix bug", head: "fix", base: "main" },
  status: "PENDING",
  created_at: new Date().toISOString(),
};

describe("ApprovalCard Component", () => {
  it("renders tool name, description and cryptographic action signature", () => {
    render(<ApprovalCard approval={mockApproval} />);
    expect(screen.getByText("create_pull_request")).toBeInTheDocument();
    expect(screen.getByText("Create pull request on facebook/react")).toBeInTheDocument();
    expect(screen.getByText(/a1b2c3d4e5f6/)).toBeInTheDocument();
  });

  it("toggles action parameters display", () => {
    render(<ApprovalCard approval={mockApproval} />);
    const toggleBtn = screen.getByText("Inspect Action Parameters");
    fireEvent.click(toggleBtn);
    expect(screen.getByText("Hide Action Parameters")).toBeInTheDocument();
    expect(screen.getByText(/"head": "fix"/)).toBeInTheDocument();
  });
});
