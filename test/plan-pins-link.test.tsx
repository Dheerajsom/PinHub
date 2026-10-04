// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PlanPinsLink } from "@/components/planner/PlanPinsLink";

afterEach(cleanup);

describe("PlanPinsLink", () => {
  it("opens the planner on the board", () => {
    render(<PlanPinsLink boardId="raspberry-pi-pico" />);
    const link = screen.getByRole("link", { name: "Plan pins on this board" });
    expect(link.getAttribute("href")).toBe("/planner?board=raspberry-pi-pico");
  });

  it("does not promise auto-assign, which only some boards support", () => {
    render(<PlanPinsLink boardId="raspberry-pi-500" />);
    expect(screen.getByRole("link").textContent).not.toMatch(/auto/i);
  });
});
