import { describe, expect, it } from "vitest";
import type { Board } from "../src/model.js";
import { renderBoard } from "../src/render/board.js";
import { unicodeChars } from "../src/render/chars.js";
import { MAX_RENDER_HEADER_ROWS } from "../src/render/sanitize.js";
import { makeChalk } from "../src/render/theme.js";

function boardWithLayout(
  layout: { rows: number; columns: number },
  position = { row: 1, column: 1 },
): Board {
  return {
    id: "external-board",
    name: "External board",
    manufacturer: "Example",
    aliases: [],
    warnings: [],
    sources: [],
    headers: [
      {
        id: "main",
        name: "Main header",
        layout,
        pins: [
          {
            physical: 1,
            position,
            label: "P1",
            category: "gpio",
          },
        ],
      },
    ],
  };
}

const OPTIONS = {
  chalk: makeChalk(false),
  chars: unicodeChars,
  width: 80,
  compact: false,
};

describe("public renderer structure validation", () => {
  it.each([Number.POSITIVE_INFINITY, Number.NaN, 0, -1, 1.5, 10_000])(
    "rejects an unsafe row count %s before rendering",
    (rows) => {
      expect(() => renderBoard(boardWithLayout({ rows, columns: 2 }), OPTIONS)).toThrow(
        /layout\.rows must be a positive safe integer/,
      );
    },
  );

  it("accepts the documented maximum row count", () => {
    const output = renderBoard(
      boardWithLayout({ rows: MAX_RENDER_HEADER_ROWS, columns: 2 }),
      OPTIONS,
    );
    expect(output).toContain("External board");
  });

  it.each([0, 3, Number.POSITIVE_INFINITY])("rejects invalid column count %s", (columns) => {
    expect(() => renderBoard(boardWithLayout({ rows: 1, columns }), OPTIONS)).toThrow(
      /layout\.columns must be 1 or 2/,
    );
  });

  it("rejects pin positions outside the declared layout", () => {
    expect(() =>
      renderBoard(boardWithLayout({ rows: 2, columns: 2 }, { row: 3, column: 1 }), OPTIONS),
    ).toThrow(/position\.row must be a positive safe integer/);
    expect(() =>
      renderBoard(boardWithLayout({ rows: 2, columns: 2 }, { row: 1, column: 3 }), OPTIONS),
    ).toThrow(/position\.column must be a positive safe integer/);
  });

  it("rejects duplicate physical pin numbers and grid positions", () => {
    const duplicatePhysical = boardWithLayout({ rows: 2, columns: 1 });
    duplicatePhysical.headers[0]?.pins.push({
      physical: 1,
      position: { row: 2, column: 1 },
      label: "P2",
      category: "gpio",
    });
    expect(() => renderBoard(duplicatePhysical, OPTIONS)).toThrow(
      /duplicate physical pin number/,
    );

    const duplicateCell = boardWithLayout({ rows: 1, columns: 2 });
    duplicateCell.headers[0]?.pins.push({
      physical: 2,
      position: { row: 1, column: 1 },
      label: "P2",
      category: "gpio",
    });
    expect(() => renderBoard(duplicateCell, OPTIONS)).toThrow(
      /duplicate grid position/,
    );
  });
});
