import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ModelSelectorModal } from "@/components/models/ModelSelectorModal";
import { useChatStore } from "@/store/use-chat-store";

vi.mock("@/lib/api", () => ({
  fetchModelsConfig: vi.fn().mockResolvedValue({
    active_provider: "gemini",
    active_model: "gemini-2.0-flash",
    allow_cloud_code: true,
    providers: {
      gemini: {
        id: "gemini",
        name: "Google Gemini",
        model: "gemini-2.0-flash",
        has_key: true,
        masked_key: "AIzaSy...1234",
        supported_models: ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"],
        description: "High-performance multimodal models",
      },
      openai: {
        id: "openai",
        name: "OpenAI",
        model: "gpt-4o",
        has_key: false,
        supported_models: ["gpt-4o", "gpt-4o-mini"],
        description: "Reasoning and coding models",
      },
      openrouter: {
        id: "openrouter",
        name: "OpenRouter",
        model: "meta-llama/llama-3.3-70b-instruct",
        has_key: false,
        supported_models: ["meta-llama/llama-3.3-70b-instruct", "anthropic/claude-3.5-sonnet"],
        description: "100+ models gateway",
      },
      ollama: {
        id: "ollama",
        name: "Ollama (Local)",
        model: "qwen2.5-coder:7b",
        has_key: true,
        supported_models: ["qwen2.5-coder:7b"],
        description: "Offline local inference",
      },
    },
  }),
  updateModelConfig: vi.fn().mockResolvedValue({
    active_provider: "openai",
    active_model: "gpt-4o",
    allow_cloud_code: true,
    providers: {},
  }),
  testModelConnection: vi.fn().mockResolvedValue({
    provider: "gemini",
    model: "gemini-2.0-flash",
    is_available: true,
    supports_tool_calling: true,
    latency_ms: 85,
  }),
}));

describe("ModelSelectorModal Component", () => {
  beforeEach(() => {
    useChatStore.setState({
      isModelModalOpen: true,
      activeProvider: "gemini",
      activeModel: "gemini-2.0-flash",
    });
  });

  it("renders modal with AI providers", () => {
    render(<ModelSelectorModal />);
    expect(screen.getByText("AI Engine & Model Configuration")).toBeDefined();
    expect(screen.getAllByText("Gemini").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("OpenAI").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("OpenRouter").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Ollama").length).toBeGreaterThanOrEqual(1);
  });

  it("switches to OpenRouter tab and shows API key input", () => {
    render(<ModelSelectorModal />);
    const openRouterTab = screen.getAllByText("OpenRouter")[0];
    fireEvent.click(openRouterTab);

    expect(screen.getByPlaceholderText(/Enter OpenRouter API key/)).toBeDefined();
    expect(screen.getByText("Test Connection")).toBeDefined();
    expect(screen.getByText("Save & Activate Model")).toBeDefined();
  });
});
