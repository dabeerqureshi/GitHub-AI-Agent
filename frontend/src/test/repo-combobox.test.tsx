import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RepoCombobox } from "@/components/layout/RepoCombobox";
import { useChatStore } from "@/store/use-chat-store";

vi.mock("@/lib/api", () => ({
  refreshRepositories: vi.fn().mockResolvedValue([]),
  fetchRepositories: vi.fn().mockResolvedValue([]),
}));

describe("RepoCombobox Component", () => {
  beforeEach(() => {
    useChatStore.setState({
      activeRepo: "octocat/Hello-World",
      repositories: [
        {
          id: "r1",
          full_name: "octocat/Hello-World",
          name: "Hello-World",
          owner: "octocat",
          default_branch: "main",
          is_private: false,
          is_cloned: true,
          last_synced_at: new Date().toISOString(),
        },
        {
          id: "r2",
          full_name: "facebook/react",
          name: "react",
          owner: "facebook",
          default_branch: "main",
          is_private: false,
          is_cloned: false,
          last_synced_at: new Date().toISOString(),
        },
      ],
      isAuthModalOpen: false,
    });
  });

  it("renders trigger with active repository", () => {
    render(<RepoCombobox />);
    expect(screen.getByText("octocat/Hello-World")).toBeDefined();
  });

  it("opens dropdown and lists repositories when clicked", () => {
    render(<RepoCombobox />);
    const trigger = screen.getByRole("button", { expanded: false });
    fireEvent.click(trigger);

    expect(screen.getByPlaceholderText("Search repositories...")).toBeDefined();
    expect(screen.getByText("react")).toBeDefined();
  });

  it("selects a new repository when clicked in dropdown", () => {
    render(<RepoCombobox />);
    const trigger = screen.getByRole("button", { expanded: false });
    fireEvent.click(trigger);

    const reactOption = screen.getByText("react");
    fireEvent.click(reactOption);

    expect(useChatStore.getState().activeRepo).toBe("facebook/react");
  });
});
