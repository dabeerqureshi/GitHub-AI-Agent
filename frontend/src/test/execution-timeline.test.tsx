import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ExecutionTimeline } from "../components/runs/ExecutionTimeline";
import * as api from "../lib/api";

const mockRuns: api.ExecutionRun[] = [
  {
    id: "run-101",
    conversation_id: "conv-1",
    thread_id: "thread-101",
    repo_name: "octocat/Hello-World",
    status: "INTERRUPTED",
    user_request: "Refactor database connection pool",
    current_step: "execute_tool",
    error_message: "Execution interrupted due to backend restart or shutdown.",
    retry_count: 0,
    created_at: new Date().toISOString(),
    step_history: [
      {
        step: "plan_and_route",
        status: "SUCCESS",
        timestamp: new Date().toISOString(),
      },
      {
        step: "execute_tool",
        status: "INTERRUPTED",
        message: "Process restarted",
        timestamp: new Date().toISOString(),
      },
    ],
  },
  {
    id: "run-102",
    conversation_id: "conv-2",
    thread_id: "thread-102",
    repo_name: "facebook/react",
    status: "COMPLETED",
    user_request: "Fix memory leak in renderer",
    current_step: "completed",
    retry_count: 1,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    completed_at: new Date().toISOString(),
    step_history: [
      {
        step: "plan_and_route",
        status: "SUCCESS",
        timestamp: new Date().toISOString(),
      },
      {
        step: "completed",
        status: "SUCCESS",
        timestamp: new Date().toISOString(),
      },
    ],
  },
];

describe("ExecutionTimeline Component", () => {
  beforeEach(() => {
    vi.spyOn(api, "fetchExecutionRuns").mockResolvedValue(mockRuns);
    vi.spyOn(api, "resumeExecutionRun").mockResolvedValue({
      ...mockRuns[0],
      status: "RUNNING",
    });
    vi.spyOn(api, "cancelExecutionRun").mockResolvedValue({
      ...mockRuns[0],
      status: "CANCELLED",
    });
  });

  it("renders execution runs list and timeline steps", async () => {
    render(<ExecutionTimeline />);

    await waitFor(() => {
      expect(screen.getAllByText("Refactor database connection pool").length).toBeGreaterThan(0);
      expect(screen.getByText("Fix memory leak in renderer")).toBeInTheDocument();
      expect(screen.getByText("Diagnostic Detail:")).toBeInTheDocument();
      expect(screen.getByText(/Execution interrupted due to backend restart/)).toBeInTheDocument();
    });
  });

  it("allows resuming an interrupted execution run", async () => {
    render(<ExecutionTimeline />);

    await waitFor(() => {
      expect(screen.getByText("▶ Resume Run")).toBeInTheDocument();
    });

    const resumeBtn = screen.getByText("▶ Resume Run");
    fireEvent.click(resumeBtn);

    await waitFor(() => {
      expect(api.resumeExecutionRun).toHaveBeenCalledWith("run-101");
    });
  });
});
