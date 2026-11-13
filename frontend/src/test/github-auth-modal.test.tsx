import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GitHubAuthModal } from "@/components/auth/GitHubAuthModal";
import { useChatStore } from "@/store/use-chat-store";

vi.mock("@/lib/api", () => ({
  connectGitHubToken: vi.fn().mockResolvedValue({
    status: "connected",
    message: "Connected",
    user: {
      login: "octocat",
      name: "The Octocat",
      avatar_url: "https://github.com/images/error/octocat_happy.gif",
      public_repos: 8,
      total_private_repos: 0,
    },
    synced_repositories: 5,
  }),
  disconnectGitHub: vi.fn().mockResolvedValue({ status: "disconnected" }),
}));

describe("GitHubAuthModal Component", () => {
  beforeEach(() => {
    useChatStore.setState({
      isAuthModalOpen: true,
      githubUser: null,
      isConnectingToken: false,
      repositories: [],
    });
  });

  it("renders PAT input when user is not connected", () => {
    render(<GitHubAuthModal />);
    expect(screen.getByText("GitHub Authentication")).toBeDefined();
    expect(screen.getByPlaceholderText(/github_pat_/)).toBeDefined();
    expect(screen.getByText("Connect & Sync Repos")).toBeDefined();
  });

  it("renders authenticated profile banner when user is connected", () => {
    useChatStore.setState({
      isAuthModalOpen: true,
      githubUser: {
        login: "octocat",
        name: "The Octocat",
        avatar_url: "https://github.com/images/error/octocat_happy.gif",
        public_repos: 8,
        total_private_repos: 0,
      },
    });

    render(<GitHubAuthModal />);
    expect(screen.getByText("The Octocat")).toBeDefined();
    expect(screen.getByText("@octocat")).toBeDefined();
    expect(screen.getByText("Disconnect Account")).toBeDefined();
  });
});
