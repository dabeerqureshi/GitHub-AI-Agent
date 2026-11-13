import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DiffViewer, StructuredDiff } from "@/components/chat/DiffViewer";

describe("DiffViewer Component", () => {
  const mockStructuredDiff: StructuredDiff = {
    summary: "1 file(s) changed, +5 additions, -2 deletions",
    total_files: 1,
    total_additions: 5,
    total_deletions: 2,
    files: [
      {
        filename: "src/calculator.py",
        status: "modified",
        additions: 5,
        deletions: 2,
        patch: "@@ -1,3 +1,6 @@\n-def subtract(a, b):\n+def subtract(a: int, b: int) -> int:\n+    # verified fix\n     return a - b",
      },
    ],
  };

  it("renders changed file count and addition/deletion metrics", () => {
    render(<DiffViewer structuredDiff={mockStructuredDiff} />);

    expect(screen.getByText("Code Changes Review")).toBeDefined();
    expect(screen.getByText("(1 files)")).toBeDefined();
    expect(screen.getByText("src/calculator.py")).toBeDefined();
    expect(screen.getByText("+5")).toBeDefined();
    expect(screen.getByText("-2")).toBeDefined();
  });

  it("renders diff lines with syntax styling", () => {
    render(<DiffViewer structuredDiff={mockStructuredDiff} />);

    expect(screen.getByText("+def subtract(a: int, b: int) -> int:")).toBeDefined();
    expect(screen.getByText("-def subtract(a, b):")).toBeDefined();
  });

  it("triggers approval actions when provided", () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();

    render(
      <DiffViewer
        structuredDiff={mockStructuredDiff}
        onApprove={onApprove}
        onReject={onReject}
      />
    );

    const approveBtn = screen.getByText("Approve Changes & Open PR");
    const rejectBtn = screen.getByText("Reject Patch");

    fireEvent.click(approveBtn);
    expect(onApprove).toHaveBeenCalledOnce();

    fireEvent.click(rejectBtn);
    expect(onReject).toHaveBeenCalledOnce();
  });
});
