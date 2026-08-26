import { describe, expect, it } from "vitest";
import { summarizeBoard } from "@/lib/board-summary";
import type { Board } from "@/lib/boards";

function board(overrides: Partial<Board> = {}): Board {
  return {
    id: "fixture-board",
    name: "Fixture Board",
    vendor: "Raspberry Pi",
    category: "Development Board",
    family: "Fixture family",
    processor: "Fixture MCU",
    logicLevel: "3.3 V",
    power: "USB",
    formFactor: "Fixture",
    description: "Source-backed test fixture",
    tags: ["fixture"],
    interfaces: ["GPIO"],
    highlights: [],
    warnings: [],
    sourceLinks: [
      {
        label: "Official documentation",
        url: "https://www.raspberrypi.com/documentation/",
        type: "Docs",
      },
    ],
    ...overrides,
  };
}

describe("summarizeBoard", () => {
  it("retains insertion metadata and derives official documentation availability", () => {
    const summary = summarizeBoard(board(), 17);

    expect(summary.catalogIndex).toBe(17);
    expect(summary.hasOfficialDocumentation).toBe(true);
    expect(summary).not.toHaveProperty("pinout");
    expect(summary).not.toHaveProperty("sourceLinks");
  });

  it("marks a summary without a vendor-official reference as unavailable", () => {
    const summary = summarizeBoard(
      board({
        sourceLinks: [
          {
            label: "Community notes",
            url: "https://example.com/fixture",
            type: "Docs",
          },
        ],
      }),
    );

    expect(summary.hasOfficialDocumentation).toBe(false);
  });
});
