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

describe("BoardDetailPanel full board page link", () => {
  it("links to the board page and, separately, to the planner", () => {
    const board = catalogBoard("raspberry-pi-pico");
    expect(board.pinFunctions).toBeDefined();
    renderPanel(board);

    const page = screen.getByRole("link", { name: /Open full board page/ });
    expect(page.getAttribute("href")).toBe("/boards/raspberry-pi-pico");
    const plan = screen.getByRole("link", { name: /Plan pins on this board/ });
    expect(plan.getAttribute("href")).toBe("/planner?board=raspberry-pi-pico");
    expect(plan.textContent).toContain("auto-assign");
    expect(plan.getAttribute("target")).toBeNull();
  });

  it("does not promise auto-assign to a board without pin function data", () => {
    const board = catalogBoard("raspberry-pi-500");
    expect(board.pinFunctions).toBeUndefined();
    renderPanel(board);

    expect(
      screen.getByRole("link", { name: /Open full board page/ }).getAttribute("href"),
    ).toBe("/boards/raspberry-pi-500");
    const plan = screen.queryByRole("link", { name: /Plan pins on this board/ });
    if (board.pinout) expect(plan?.textContent).not.toMatch(/auto/i);
    else expect(plan).toBeNull();
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
    expect(screen.queryByRole("link", { name: /Open full board page/ })).toBeNull();
  });
});
