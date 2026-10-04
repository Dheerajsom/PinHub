// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { boards, type Board } from "@/lib/boards";
import { summarizeBoard } from "@/lib/board-summary";
import { BoardDetailPanel } from "@/components/BoardDetailPanel";

function catalogBoard(id: string): Board {
  const found = boards.find((item) => item.id === id);
  if (!found) throw new Error(`${id} missing from the catalog`);
  return found;
}

function renderPanel(board: Board) {
  return render(
    <BoardDetailPanel
      expectedBoard={summarizeBoard(board)}
      detailState={{ status: "ready", board }}
      onRetry={() => {}}
      onBackToResults={() => {}}
    />,
  );
}

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(cleanup);

describe("BoardDetailPanel header card", () => {
  it("links to the board page and, separately, to the planner", () => {
    const board = catalogBoard("raspberry-pi-pico");
    renderPanel(board);

    const page = screen.getByRole("link", { name: /Board page/ });
    expect(page.getAttribute("href")).toBe("/boards/raspberry-pi-pico");
    const plan = screen.getByRole("link", { name: /Plan pins/ });
    expect(plan.getAttribute("href")).toBe("/planner?board=raspberry-pi-pico");
    expect(plan.getAttribute("target")).toBeNull();
  });

  it("offers no planner link for a board without a pin map", () => {
    const board = boards.find((item) => !item.pinout);
    if (!board) return;
    renderPanel(board);
    expect(screen.getByRole("link", { name: /Board page/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Plan pins/ })).toBeNull();
  });

  it("names the board once and keeps the specs, without eyebrow or duplicate lines", () => {
    // Regression: the card repeated itself — a "Selected board" eyebrow, a
    // category chip, a vendor / family line, and Collection + Compare buttons
    // that duplicated the More menu and the catalog row.
    const board = catalogBoard("raspberry-pi-5");
    const { container } = renderPanel(board);
    const card = container.querySelector("section")!;

    expect(card.textContent).not.toMatch(/Selected board/i);
    expect(card.textContent).not.toContain(`${board.vendor} / ${board.family}`);
    expect(screen.getAllByRole("heading", { name: board.name })).toHaveLength(1);
    for (const label of ["Processor", "Logic", "Power", "Format"]) {
      expect(card.textContent).toContain(label);
    }
    expect(screen.queryByRole("button", { name: "Collection" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Compare" })).toBeNull();
    expect(screen.getByRole("button", { name: "More board actions" })).toBeTruthy();
  });

  it("hides the revision notes section when the record has none", () => {
    const board = catalogBoard("raspberry-pi-5");
    renderPanel(board);
    expect(screen.queryByText(/No revision-specific note/)).toBeNull();
  });

  it("is not shown while the board details are still loading", () => {
    const board = catalogBoard("raspberry-pi-pico");
    render(
      <BoardDetailPanel
        expectedBoard={summarizeBoard(board)}
        detailState={{ status: "loading", board: null, id: board.id }}
        onRetry={() => {}}
        onBackToResults={() => {}}
      />,
    );
    expect(screen.queryByRole("link", { name: /Board page/ })).toBeNull();
  });
});
