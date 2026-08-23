import { describe, expect, it } from "vitest";
import type { Board, Pin } from "@/lib/boards";
import { analyzePinConflicts } from "@/lib/compare-conflicts";

function board(id: string, pins: Pin[], connector = "40-pin GPIO header"): Board {
  return {
    id,
    name: id,
    vendor: "Fixture",
    category: "Microcontroller",
    family: "Fixture family",
    processor: "Fixture MCU",
    logicLevel: "3.3 V",
    power: "USB",
    formFactor: "Fixture",
    description: "Fixture board",
    tags: [],
    interfaces: [],
    highlights: [],
    warnings: [],
    sourceLinks: [{ label: "Docs", url: "https://example.com/docs", type: "Docs" }],
    pinout: {
      connector,
      layout: "grouped",
      notes: ["Fixture source note"],
      groups: [{ label: "Header", pins }],
    },
  };
}

describe("analyzePinConflicts", () => {
  it("reports a changed physical position only for comparable connectors", () => {
    const left = board("left", [{ position: 1, label: "3V3", role: "power" }]);
    const right = board("right", [{ position: 1, label: "5V", role: "power" }]);
    const conflict = analyzePinConflicts([left, right]).find(
      (item) => item.kind === "power-rail",
    );

    expect(conflict?.title).toContain("position 1");
    expect(conflict?.detail).toMatch(/Verify/);
  });

  it("does not equate connector-local positions from different contexts", () => {
    const left = board("left", [{ position: 1, label: "GPIO1", role: "gpio" }], "J1 2x10 header");
    const right = board("right", [{ position: 1, label: "GPIO2", role: "gpio" }], "J3 2x10 header");

    expect(analyzePinConflicts([left, right]).some((item) => item.kind === "connector-position")).toBe(false);
  });

  it("surfaces alternate functions, risk pins, and shared interface capability", () => {
    const left = board("left", [{ position: 1, label: "D5", role: "system", aliases: ["GPIO5", "SPI0 CS"], note: "Boot strap" }]);
    const right = board("right", [{ position: 2, label: "GPIO5", role: "gpio", aliases: ["SPI0 CS"] }]);
    left.interfaces = ["SPI", "UART"];
    right.interfaces = ["SPI"];

    const conflicts = analyzePinConflicts([left, right]);
    expect(conflicts.some((item) => item.kind === "boot-or-reserved")).toBe(true);
    expect(conflicts.some((item) => item.kind === "alternate-function")).toBe(true);
    expect(conflicts.some((item) => item.kind === "interface-reuse")).toBe(true);
    expect(conflicts.every((item) => item.detail.length > 0)).toBe(true);
  });
});
