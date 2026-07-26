import { describe, expect, it } from "vitest";
import {
  createBoardSearchIndex,
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

    expect(scoreOf(board, "pico")).toBe(100); // word prefix in the name
    expect(scoreOf(board, "ico")).toBe(60); // substring of the name only
    expect(scoreOf(board, "rp2040")).toBe(20); // supporting field only
  });

  it("excludes a board when any token is missing", () => {
    const board = summary({ name: "Arduino Uno" });

    expect(scoreOf(board, "arduino uno")).toBeGreaterThan(0);
    expect(scoreOf(board, "arduino nucleo")).toBe(0);
  });

  it("sums the per-token scores so more matches rank higher", () => {
    const board = summary({ name: "Arduino Uno R3" });

    expect(scoreOf(board, "arduino")).toBe(100);
    expect(scoreOf(board, "arduino uno")).toBe(200);
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

    expect(scoreOf(board, "tolerant")).toBe(20);
    expect(scoreOf(board, "lora")).toBe(20);
    expect(scoreOf(board, "can")).toBe(20);
    expect(scoreOf(board, "feather")).toBe(20);
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
});
