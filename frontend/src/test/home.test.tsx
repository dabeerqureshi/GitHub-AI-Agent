import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WorkspacePage from "../app/page";

// Mock fetch for navbar health check
global.fetch = vi.fn().mockImplementation((url: string) => {
  if (url.includes("/healthz")) {
    return Promise.resolve({
      ok: true,
      json: async () => ({
        status: "ok",
        database: "healthy",
        default_provider: "ollama",
        mcp_transport: "stdio",
      }),
    });
  }
  return Promise.resolve({
    ok: true,
    json: async () => [],
  });
}) as any;

describe("WorkspacePage", () => {
  it("renders navbar and welcome container", () => {
    render(<WorkspacePage />);
    expect(screen.getAllByText("GitHub AI Workspace").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("New Workspace Session")).toBeInTheDocument();
  });
});
