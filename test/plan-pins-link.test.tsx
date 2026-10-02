// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PlanPinsLink } from "@/components/planner/PlanPinsLink";

afterEach(cleanup);

describe("PlanPinsLink", () => {
  it("opens the planner on the board and says what it offers", () => {
    render(<PlanPinsLink boardId="raspberry-pi-pico" auto />);
    const link = screen.getByRole("link", { name: /Plan pins on this board/ });
    expect(link.getAttribute("href")).toBe("/planner?board=raspberry-pi-pico");
    expect(link.textContent).toContain("auto-assign");
  });

  it("does not promise auto-assign where the data is missing", () => {
    render(<PlanPinsLink boardId="raspberry-pi-500" auto={false} />);
    expect(screen.getByRole("link").textContent).not.toMatch(/auto/i);
  });
});
