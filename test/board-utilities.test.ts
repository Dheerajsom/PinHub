import { describe, expect, it } from "vitest";
import { boardPinSnippet, revisionNotesFor } from "@/lib/board-utilities";
import type { Board } from "@/lib/boards";

const board: Board = {
  id: "test-board",
  name: "Test Board",
  vendor: "Vendor",
  category: "Microcontroller",
  family: "Test",
  processor: "MCU",
  logicLevel: "3.3 V",
  power: "USB",
  formFactor: "Breadboard",
  description: "Test",
  tags: [],
  interfaces: ["I2C", "GPIO"],
  highlights: [],
  warnings: ["Revision B changes the LED pin."],
  sourceLinks: [{ label: "Docs", url: "https://example.com/docs", type: "Docs" }],
  pinout: {
    connector: "Header",
    layout: "dual-row",
    notes: [],
    pins: {
      left: [{ position: 1, label: "GPIO2", role: "i2c", aliases: ["SDA"] }],
      right: [{ position: 2, label: "GPIO4", role: "gpio" }],
    },
  },
};

describe("board utilities", () => {
  it("builds a factual starter lookup from mapped pins", () => {
    expect(boardPinSnippet(board)).toContain('physical: 1, signal: "GPIO2"');
    expect(boardPinSnippet(board)).toContain("verify warnings before wiring");
  });

  it("extracts revision-specific caveats without inventing them", () => {
    expect(revisionNotesFor(board)).toEqual(["Revision B changes the LED pin."]);
  });
});

