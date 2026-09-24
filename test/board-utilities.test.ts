import { describe, expect, it } from "vitest";
import { boardPinSnippet, fiveVoltCaution, revisionNotesFor } from "@/lib/board-utilities";
import { boards } from "@/lib/boards";
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


describe("fiveVoltCaution", () => {
  const caution = (logicLevel: string, warnings: string[] = []) =>
    fiveVoltCaution({ logicLevel, warnings });

  it("repeats an explicit statement and defaults conservatively otherwise", () => {
    expect(caution("3.3 V GPIO", ["GPIO is 3.3 V only and is not 5 V tolerant."])).toBe("Not 5 V tolerant");
    expect(caution("3.3 V logic (not 5 V tolerant)")).toBe("Not 5 V tolerant");
    expect(caution("3.3 V GPIO")).toBe("Treat as not 5 V tolerant");
  });

  it("stays silent when the record describes any 5 V tolerance itself", () => {
    // Regression: the old heuristic labelled these boards "not 5V tolerant"
    // even though their records describe tolerant or limited-tolerance pins.
    expect(caution("3.3 V GPIO", ["5 V tolerant behavior is limited; check PJRC electrical notes before wiring."])).toBeNull();
    expect(caution("3.3 V GPIO (many pins 5 V tolerant)", ["Only FT-marked pins are 5 V tolerant; PA0 is NOT 5 V tolerant."])).toBeNull();
    expect(caution("3.3 V GPIO (5 V tolerance not documented by Espressif)")).toBeNull();
  });

  it("reads connector notes, where many records state tolerance", () => {
    expect(fiveVoltCaution({
      logicLevel: "3.3 V GPIO",
      warnings: ["GPIO is 3.3 V only; level-shift 5 V peripherals."],
      pinout: { connector: "J8", layout: "dual-row", notes: ["GPIO pins are 3.3 V logic and are not 5 V tolerant."], pins: { left: [], right: [] } },
    })).toBe("Not 5 V tolerant");
    expect(fiveVoltCaution(boards.find((record) => record.id === "raspberry-pi-5")!)).toBe("Not 5 V tolerant");
    expect(fiveVoltCaution(boards.find((record) => record.id === "stm32f103-blue-pill")!)).toBeNull();
  });

  it("does not caption non-3.3 V logic", () => {
    expect(caution("5 V GPIO")).toBeNull();
    expect(caution("5 V operating voltage")).toBeNull();
  });

  it("never contradicts a catalog record that mentions tolerant pins", () => {
    for (const record of boards) {
      const text = [record.logicLevel, ...record.warnings, ...(record.pinout?.notes ?? [])].join(" ");
      const positive = /\b5\s?V\s+tolerant\b/i.test(text.replace(/\bnot\s+5\s?V\s+tolerant\b/gi, ""));
      if (positive) expect(fiveVoltCaution(record), record.id).toBeNull();
    }
  });
});
