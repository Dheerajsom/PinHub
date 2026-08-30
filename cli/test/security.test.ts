import { describe, expect, it } from "vitest";
import type { Board } from "../src/model.js";
import { renderBoard } from "../src/render/board.js";
import { unicodeChars } from "../src/render/chars.js";
import { sanitizeBoardForTerminal } from "../src/render/sanitize.js";
import { makeChalk } from "../src/render/theme.js";
import { safeTerminalValue } from "../src/render/text.js";

const maliciousBoard: Board = {
  id: "unsafe\nboard",
  name: "\u001b]0;owned\u0007Probe\u202e",
  manufacturer: "Maker\u0085forged",
  aliases: ["probe\nforged"],
  warnings: [
    { severity: "warning", text: "Check voltage\nforged warning" },
  ],
  sources: [
    {
      title: "Vendor\u001b[2J docs",
      url: "https://example.com/\nforged",
      official: false,
    },
  ],
  headers: [
    {
      id: "main",
      name: "Header\nforged",
      layout: { rows: 1, columns: 1 },
      pins: [
        {
          physical: 1,
          position: { row: 1, column: 1 },
          label: "GPIO1\u001b[2J\nforged",
          category: "gpio",
          functions: ["ALT\u2066spoof"],
          notes: ["Do not drive\nforged"],
        },
      ],
    },
  ],
};

describe("terminal output boundaries", () => {
  it("flattens every line-separating character in untrusted values", () => {
    expect(safeTerminalValue("a\rb\nc\td\u2028e\u2029f")).toBe("a b c d e f");
  });

  it("deeply sanitizes board data without mutating the caller's object", () => {
    const safe = sanitizeBoardForTerminal(maliciousBoard);

    expect(safe.name).toBe("Probe ");
    expect(safe.manufacturer).toBe("Maker forged");
    expect(safe.headers[0]?.pins[0]?.label).toBe("GPIO1 forged");
    expect(safe.headers[0]?.pins[0]?.functions).toEqual(["ALT spoof"]);
    expect(maliciousBoard.name).toContain("\u001b");
    expect(maliciousBoard.headers[0]?.pins[0]?.label).toContain("\n");
  });

  it("keeps control and forged-line content out of the public renderer", () => {
    const output = renderBoard(maliciousBoard, {
      chalk: makeChalk(false),
      chars: unicodeChars,
      width: 80,
      compact: false,
    });

    const unsafeCharacters = [...output].filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return (
        code <= 0x08 ||
        code === 0x0b ||
        code === 0x0c ||
        (code >= 0x0e && code <= 0x1f) ||
        (code >= 0x7f && code <= 0x9f) ||
        (code >= 0x202a && code <= 0x202e) ||
        (code >= 0x2066 && code <= 0x2069)
      );
    });
    expect(unsafeCharacters).toEqual([]);
    expect(output).not.toContain("\nforged");
    expect(output).toContain("GPIO1 forged");
  });
});
