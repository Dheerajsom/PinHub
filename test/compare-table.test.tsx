// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Board } from "@/lib/boards";
import { CompareTable } from "@/components/CompareTable";

function board(overrides: Partial<Board> = {}): Board {
  return {
    id: "test-board",
    name: "Test Board",
    vendor: "Test Vendor",
    category: "Microcontroller",
    family: "Test",
    processor: "Test MCU",
    logicLevel: "3.3 V",
    power: "USB",
    formFactor: "Test",
    description: "Fixture board",
    tags: ["test"],
    interfaces: ["GPIO"],
    highlights: [],
    warnings: [],
    sourceLinks: [
      { label: "Docs", url: "https://example.com", type: "Docs" },
    ],
    ...overrides,
  };
}

const boards = [
  board({ id: "a", name: "Board A", processor: "RP2350", logicLevel: "3.3 V" }),
  board({ id: "b", name: "Board B", processor: "ATmega328P", logicLevel: "5 V" }),
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CompareTable", () => {
  it("deals every board's value into stacked cards for narrow screens", () => {
    render(<CompareTable boards={boards} />);

    // Both boards are named in the mobile roster, so neither is hidden past a
    // horizontal scroll edge.
    const roster = screen.getByRole("region", {
      name: "Boards in this comparison",
    });
    expect(within(roster).getByText("Comparing 2 boards")).toBeTruthy();
    expect(within(roster).getAllByRole("link", { name: "Board A" })).toHaveLength(1);
    expect(within(roster).getAllByRole("link", { name: "Board B" })).toHaveLength(1);

    // Each differing attribute becomes one card listing both values.
    const processorHeadings = screen.getAllByRole("heading", { name: "Processor" });
    const card = processorHeadings[0].closest("section") as HTMLElement;
    expect(within(card).getByText("RP2350")).toBeTruthy();
    expect(within(card).getByText("ATmega328P")).toBeTruthy();
    expect(within(card).getByText("Differs")).toBeTruthy();
  });

  it("keeps the desktop table, with a focusable scroll region", () => {
    render(<CompareTable boards={boards} />);

    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Attribute" })).toBeTruthy();

    const region = screen.getByRole("region", {
      name: "Board comparison table, scrolls horizontally",
    });
    expect(region.getAttribute("tabindex")).toBe("0");
  });

  it("shows identical attributes on request in both layouts", () => {
    render(<CompareTable boards={boards} />);

    expect(screen.queryByRole("heading", { name: "Power" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show identical" }));

    expect(screen.getByRole("heading", { name: "Power" })).toBeTruthy();
    expect(screen.getAllByText("Same").length).toBeGreaterThan(0);
  });

  it("reports clipboard failures instead of silently ignoring them", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    render(<CompareTable boards={boards} />);

    fireEvent.click(screen.getByRole("button", { name: "Share" }));

    expect(await screen.findByText("Share failed")).toBeTruthy();
  });
});
