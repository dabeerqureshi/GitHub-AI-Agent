import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchHealth, fetchConversations } from "../lib/api";

describe("Frontend API Client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchHealth parses backend health response", async () => {
    const mockHealth = {
      status: "ok",
      database: "healthy",
      default_provider: "ollama",
      mcp_transport: "stdio",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockHealth,
    } as any);

    const health = await fetchHealth();
    expect(health.status).toBe("ok");
    expect(health.database).toBe("healthy");
    expect(health.default_provider).toBe("ollama");
  });

  it("fetchConversations throws on network error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: "Internal Server Error",
    } as any);

    await expect(fetchConversations()).rejects.toThrow("Failed to fetch conversations");
  });
});
