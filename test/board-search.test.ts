import { describe, expect, it } from "vitest";
import {
  createBoardSearchIndex,
  matchBoardSearchEntry,
  canonicalizeUnits,
  scoreBoardSearchEntry,
  tokenizeQuery,
} from "@/lib/board-search";
import { summarizeBoard, type BoardSummary } from "@/lib/board-summary";
import { boards } from "@/lib/boards";

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
      powerInputs: ["USB"],
      formFactorProfile: "Other",
    },
    ...overrides,
  };
}

function scoreOf(board: BoardSummary, query: string): number {
  const [entry] = createBoardSearchIndex([board]);
  return scoreBoardSearchEntry(entry, tokenizeQuery(query));
}

function matchedBy(board: BoardSummary, query: string): string | null {
  const [entry] = createBoardSearchIndex([board]);
  return matchBoardSearchEntry(entry, tokenizeQuery(query))?.matchedBy ?? null;
}

describe("tokenizeQuery", () => {
  it("lowercases and drops surrounding or repeated whitespace", () => {
    expect(tokenizeQuery("  Raspberry   PI  ")).toEqual(["raspberry", "pi"]);
  });

  it("returns no tokens for a blank query", () => {
    expect(tokenizeQuery("   ")).toEqual([]);
  });

  it("leaves realistic queries untouched", () => {
    // The longest catalog-shaped query anyone types is a few words; the caps
    // must never reach down into that range.
    const realistic = "raspberry pi 5 not 5 v tolerant gpio header";
    // Only the spaced unit collapses ("5 v" -> "5v"); nothing is truncated.
    expect(tokenizeQuery(realistic)).toEqual(
      "raspberry pi 5 not 5v tolerant gpio header".split(" "),
    );
  });

  it("bounds a pasted wall of text so scoring stays linear and small", () => {
    const hostile = Array.from({ length: 5000 }, () => "gpio").join(" ");
    const tokens = tokenizeQuery(hostile);
    expect(tokens.length).toBeLessThanOrEqual(32);
    expect(tokens.join(" ").length).toBeLessThanOrEqual(256);
    // A bounded query still matches; it is truncated, not rejected.
    expect(scoreOf(summary(), hostile)).toBeGreaterThan(0);
  });

  it("bounds a single unbroken run of characters", () => {
    expect(tokenizeQuery("x".repeat(100_000))).toEqual(["x".repeat(256)]);
  });
});

describe("matchBoardSearchEntry", () => {
  it("scores every board equally when the query is empty", () => {
    expect(scoreOf(summary(), "")).toBe(1);
    expect(scoreOf(summary({ name: "Something Else" }), "  ")).toBe(1);
    expect(matchedBy(summary(), "")).toBeNull();
  });

  it("ranks an exact name word above a substring above a field hit", () => {
    const board = summary({
      name: "Raspberry Pi Pico",
      vendor: "Raspberry Pi",
      processor: "RP2040",
    });

    expect(scoreOf(board, "pico")).toBe(140); // whole word in the name
    expect(scoreOf(board, "ico")).toBe(60); // substring of the name only
    expect(scoreOf(board, "rp2040")).toBe(30); // supporting spec field only
  });

  it("ranks a word prefix below a whole word and above a bare substring", () => {
    const board = summary({ name: "Feather Board" });

    expect(scoreOf(board, "feather")).toBeGreaterThan(scoreOf(board, "feath"));
    expect(scoreOf(board, "feath")).toBeGreaterThan(scoreOf(board, "eath"));
  });

  it("puts an exact board name far ahead of an incidental mention", () => {
    const exact = summary({ id: "pi-5", name: "Raspberry Pi 5" });
    const mentions = summary({
      id: "hat",
      name: "Sensor HAT",
      description:
        "Stacks onto the Raspberry Pi 5, Raspberry Pi 4, and Raspberry Pi Zero.",
    });

    expect(scoreOf(exact, "raspberry pi 5")).toBeGreaterThan(
      scoreOf(mentions, "raspberry pi 5") * 2,
    );
    expect(matchedBy(exact, "raspberry pi 5")).toBe("name");
    expect(matchedBy(mentions, "raspberry pi 5")).toBe("description");
  });

  it("ranks a name prefix above a board that only carries the vendor", () => {
    const prefix = summary({ id: "pi-5", name: "Raspberry Pi 5" });
    const sibling = summary({
      id: "pico",
      name: "Pico W",
      vendor: "Raspberry Pi",
    });

    expect(scoreOf(prefix, "raspberry pi")).toBeGreaterThan(
      scoreOf(sibling, "raspberry pi"),
    );
  });

  it("excludes a board when any token is missing", () => {
    const board = summary({ name: "Arduino Uno" });

    expect(scoreOf(board, "arduino uno")).toBeGreaterThan(0);
    expect(scoreOf(board, "arduino nucleo")).toBe(0);
    expect(matchedBy(board, "arduino nucleo")).toBeNull();
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

    expect(matchedBy(board, "tolerant")).toBe("warning");
    expect(matchedBy(board, "lora")).toBe("spec");
    expect(matchedBy(board, "can")).toBe("interface");
    expect(matchedBy(board, "feather")).toBe("interface");
  });

  it("keeps a token buried inside a longer word, but ranks it last", () => {
    const buried = summary({ id: "buried", name: "Sensor Node" }); // "pi" in "GPIO"
    const named = summary({ id: "pico", name: "Pico" });

    expect(scoreOf(buried, "pi")).toBeGreaterThan(0);
    expect(scoreOf(named, "pi")).toBeGreaterThan(scoreOf(buried, "pi") * 10);
  });

  it("reports the strongest field when several match", () => {
    const board = summary({
      name: "Pico W",
      vendor: "Raspberry Pi",
      description: "A Pico with wireless.",
    });

    expect(matchedBy(board, "pico")).toBe("name");
    expect(matchedBy(board, "raspberry")).toBe("vendor");
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

describe("engineer shorthand against the real catalog", () => {
  const index = createBoardSearchIndex(
    boards.map((board, position) => summarizeBoard(board, position)),
  );

  function ranked(query: string): string[] {
    const tokens = tokenizeQuery(query);
    return index
      .map((entry) => ({ id: entry.board.id, name: entry.board.name, score: scoreBoardSearchEntry(entry, tokens) }))
      .filter((hit) => hit.score > 0)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .map((hit) => hit.id);
  }

  it("collapses spaced units in both the query and the catalog", () => {
    expect(canonicalizeUnits("not 5 v tolerant, 3.3 v gpio, 240 mhz")).toBe(
      "not 5v tolerant, 3.3v gpio, 240mhz",
    );
    expect(canonicalizeUnits("5 via")).toBe("5 via");
  });

  it("returns results for the \"5V tolerant\" quick query offered on the first screen", () => {
    // Regression: catalog text says "5 V tolerant", so the glued spelling the
    // suggestion chip types used to land on an empty result list.
    const hits = ranked("5V tolerant");
    expect(hits.length).toBeGreaterThan(10);
    expect(ranked("5 V tolerant")).toEqual(hits);
  });

  it("finds boards by part numbers typed without separators", () => {
    // "pi5" is genuinely ambiguous between the two "Pi 5" boards.
    expect(ranked("pi5").slice(0, 2).sort()).toEqual([
      "orange-pi-5",
      "raspberry-pi-5",
    ]);
    expect(ranked("rpi5")[0]).toBe("raspberry-pi-5");
    expect(ranked("picow")[0]).toBe("raspberry-pi-pico-w");
    expect(ranked("nucleof401re")[0]).toBe("stm32-nucleo-f401re");
    expect(ranked("nano33").slice(0, 2).sort()).toEqual([
      "arduino-nano-33-ble-sense",
      "arduino-nano-33-iot",
    ]);
    const s3 = ranked("esp32s3");
    expect(s3).toContain("esp32-s3-devkitc-1");
    expect(s3).not.toContain("esp32-c3-devkitm-1");
  });

  it("does not let shorthand splitting widen interface lookups", () => {
    // "i2c" is a real token; it must not fall through to letter/digit runs.
    expect(ranked("i2c").length).toBe(
      index.filter((entry) => entry.text.includes("i2c")).length,
    );
  });
});
