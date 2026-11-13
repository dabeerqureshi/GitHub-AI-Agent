import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "../app/page";

describe("HomePage", () => {
  it("renders the main heading", () => {
    render(<HomePage />);
    expect(screen.getByText("GitHub AI Workspace")).toBeInTheDocument();
  });
});
