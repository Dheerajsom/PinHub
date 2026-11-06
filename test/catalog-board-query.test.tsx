// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { boards } from "@/lib/boards";
import { summarizeBoard } from "@/lib/board-summary";
import { createBoardSearchIndex } from "@/lib/board-search";
import { defaultCatalogState } from "@/lib/catalog-state";
import { pinBoardQuery } from "@/lib/pin-match";
import { useCatalogResults } from "@/components/catalog/useCatalogResults";

const search = createBoardSearchIndex(boards.map(summarizeBoard));
const noFavorites = new Set<string>();

function resultIds(query: string): string[] {
  const { result } = renderHook(() =>
    useCatalogResults(search, { ...defaultCatalogState, query }, noFavorites),
  );
  return result.current.map((item) => item.board.id);
}

describe("catalog board query for pin-like searches", () => {
  // A single word that looks like a pin label (D1, A7) is also a board name
  // word. Dropping it left an empty board query, so the list showed the
  // whole catalog instead of the board the user named.
  it.each([
    ["d1", "lolin-d1-mini"],
    ["a7", "digilent-arty-a7"],
  ])("a bare %s still narrows the board list to %s", (query, id) => {
    const ids = resultIds(query);
    expect(ids).toContain(id);
    expect(ids.length).toBeLessThan(boards.length);
  });

  it("keeps a single word as the board query", () => {
    expect(pinBoardQuery("d1")).toBe("d1");
    expect(pinBoardQuery("GP26")).toBe("GP26");
  });

  it("searches only the board part of a board-qualified signal", () => {
    expect(pinBoardQuery("pico sda")).toBe("pico");
    expect(pinBoardQuery("esp32 gpio27")).toBe("esp32");
    expect(resultIds("pico sda")).toContain("raspberry-pi-pico");
  });
});
