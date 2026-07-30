import { describe, expect, it } from "vitest";
import {
  createBoardSearchIndex,
  getBoardSearchMatch,
  scoreBoardSearchEntry,
  tokenizeQuery,
} from "@/lib/board-search";
import type { BoardSummary } from "@/lib/board-summary";

function summary(overrides: Partial<BoardSummary> = {}): BoardSummary {
  return {
    id: "test-board",
    name: "Test Board",
    vendor: "Test Vendor",
    category: "Microcontroller",
    family: "Test family",
    processor: "Test processor",
    logicLevel: "3.3 V",
    power: "USB",
    formFactor: "Test",
    description: "Test board fixture",
    tags: ["test"],
    interfaces: ["GPIO"],
    hasPinout: false,
    warningCount: 0,
    warningSearchText: "",
    discovery: {
      computeClass: "Microcontroller",
      logicProfile: "3.3 V",
      fiveVoltTolerance: "Unknown",
      wireless: [],
      connectorEcosystems: [],
    },
    ...overrides,
  };
}

function scoreOf(board: BoardSummary, query: string): number {
  const [entry] = createBoardSearchIndex([board]);
  return scoreBoardSearchEntry(entry, tokenizeQuery(query));
}

describe("tokenizeQuery", () => {
  it("lowercases and drops surrounding or repeated whitespace", () => {
    expect(tokenizeQuery("  Raspberry   PI  ")).toEqual(["raspberry", "pi"]);
  });

  it("returns no tokens for a blank query", () => {
    expect(tokenizeQuery("   ")).toEqual([]);
  });
});

describe("scoreBoardSearchEntry", () => {
  it("scores every board equally when the query is empty", () => {
    expect(scoreOf(summary(), "")).toBe(1);
    expect(scoreOf(summary({ name: "Something Else" }), "  ")).toBe(1);
  });

  it("ranks a name word-prefix above a name substring above a field hit", () => {
    const board = summary({
      name: "Raspberry Pi Pico",
      vendor: "Raspberry Pi",
      processor: "RP2040",
    });

    expect(scoreOf(board, "pico")).toBeGreaterThan(scoreOf(board, "ico"));
    expect(scoreOf(board, "ico")).toBeGreaterThan(scoreOf(board, "rp2040"));
  });

  it("excludes a board when any token is missing", () => {
    const board = summary({ name: "Arduino Uno" });

    expect(scoreOf(board, "arduino uno")).toBeGreaterThan(0);
    expect(scoreOf(board, "arduino nucleo")).toBe(0);
  });

  it("sums the per-token scores so more matches rank higher", () => {
    const board = summary({ name: "Arduino Uno R3" });

    expect(scoreOf(board, "arduino uno")).toBeGreaterThan(
      scoreOf(board, "arduino"),
    );
  });

  it("matches warnings, tags, interfaces, and connector ecosystems", () => {
    const board = summary({
      warningSearchText: "Not 5 V tolerant on any GPIO.",
      tags: ["lora"],
      interfaces: ["GPIO", "CAN"],
      discovery: {
        ...summary().discovery,
        connectorEcosystems: ["Feather"],
      },
    });

    expect(scoreOf(board, "tolerant")).toBe(40);
    expect(scoreOf(board, "lora")).toBe(25);
    expect(scoreOf(board, "can")).toBe(55);
    expect(scoreOf(board, "feather")).toBe(25);
  });

  it("builds one reusable entry per board", () => {
    const index = createBoardSearchIndex([
      summary({ id: "a", name: "Board A" }),
      summary({ id: "b", name: "Board B" }),
    ]);

    expect(index.map((entry) => entry.board.id)).toEqual(["a", "b"]);
    expect(index[0].nameWords).toEqual(["board", "a"]);
    expect(index[0].text).toContain("board a");
  });

  it("prioritizes an exact board name above a family prefix or field match", () => {
    const boards = [
      summary({ id: "exact", name: "Raspberry Pi 5" }),
      summary({ id: "prefix", name: "Raspberry Pi 500" }),
      summary({
        id: "supporting",
        name: "Compute Module",
        description: "A Raspberry Pi 5 class compute module",
      }),
    ];
    const index = createBoardSearchIndex(boards);
    const ranked = index
      .map((entry) => ({
        id: entry.board.id,
        score: scoreBoardSearchEntry(entry, tokenizeQuery("Raspberry Pi 5")),
      }))
      .sort((a, b) => b.score - a.score);

    expect(ranked.map(({ id }) => id)).toEqual([
      "exact",
      "prefix",
      "supporting",
    ]);
  });

  it("reports the field that best explains a match", () => {
    const [entry] = createBoardSearchIndex([
      summary({
        name: "Signal Board",
        vendor: "Acme Labs",
        interfaces: ["CAN"],
        warningSearchText: "Boot strap pin must remain high.",
      }),
    ]);

    expect(getBoardSearchMatch(entry, "signal").matchedBy).toBe("name");
    expect(getBoardSearchMatch(entry, "acme").matchedBy).toBe("vendor");
    expect(getBoardSearchMatch(entry, "can").matchedBy).toBe("interface");
    expect(getBoardSearchMatch(entry, "strap").matchedBy).toBe("warning");
  });
});
