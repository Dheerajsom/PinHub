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
  it("sends a board with pin function data straight to its planner", () => {
    const board = catalogBoard("raspberry-pi-pico");
    expect(board.pinFunctions).toBeDefined();
    renderPanel(board);

    const link = screen.getByRole("link", { name: /Open full board page/ });
    expect(link.getAttribute("href")).toBe("/boards/raspberry-pi-pico#plan");
    expect(link.textContent).toContain("Plan pins for your circuit");
    expect(link.getAttribute("target")).toBeNull();
  });

  it("does not promise a planner to a board without pin function data", () => {
    const board = catalogBoard("raspberry-pi-500");
    expect(board.pinFunctions).toBeUndefined();
    renderPanel(board);

    const link = screen.getByRole("link", { name: /Open full board page/ });
    expect(link.getAttribute("href")).toBe("/boards/raspberry-pi-500");
    expect(link.textContent).not.toMatch(/plan/i);
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
