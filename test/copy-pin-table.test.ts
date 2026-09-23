import { describe, expect, it } from "vitest";
import {
  pinExportFilename,
  pinoutToCsv,
  pinoutToMarkdown,
  primaryExportSource,
  type PinExportBoard,
} from "@/components/CopyPinTable";
import { boards } from "@/lib/boards";
import { pinToText } from "@/components/CopyPinButton";
import type { Pinout } from "@/lib/boards";

describe("pinoutToMarkdown", () => {
  it("escapes Markdown separators, backslashes, and line breaks in cells", () => {
    const pinout: Pinout = {
      connector: "Test",
      layout: "grouped",
      notes: [],
      groups: [
        {
          label: "Header | A",
          pins: [
            {
              position: 1,
              label: "SIG|ALT",
              role: "gpio",
              aliases: ["path\\name"],
              note: "line one\nline two",
            },
          ],
        },
      ],
    };

    const markdown = pinoutToMarkdown(pinout);

    expect(markdown).toContain("**Header \\| A**");
    expect(markdown).toContain("SIG\\|ALT");
    expect(markdown).toContain("path\\\\name");
    expect(markdown).toContain("line one<br>line two");
  });

  it("keeps connector and safety-note line breaks inside their Markdown fields", () => {
    const pinout: Pinout = {
      connector: "Header\r\n# forged heading",
      layout: "grouped",
      notes: ["Use 3.3 V only\r> forged quote"],
      groups: [
        {
          label: "Pins",
          pins: [{ position: 1, label: "D1", role: "gpio" }],
        },
      ],
    };

    const markdown = pinoutToMarkdown(pinout);
    expect(markdown).not.toContain("\r");
    expect(markdown).not.toContain("\n# forged heading");
    expect(markdown).not.toContain("\n> forged quote");
    expect(markdown).toContain("Header<br># forged heading");
    expect(markdown).toContain("Use 3.3 V only<br>> forged quote");
  });

  it("exports formula-safe CSV with connector groups and escaped cells", () => {
    const pinout: Pinout = {
      connector: "=HYPERLINK(\"https://example.test\")",
      layout: "grouped",
      notes: ["Do not expose this connector to 5 V."],
      groups: [{
        label: "@Bank 1",
        pins: [{
          position: 2,
          label: '+3.3V "ALT"',
          role: "i2c",
          aliases: ["-GPIO4"],
          note: "  =1+1\rforbidden",
        }],
      }],
    };
    const csv = pinoutToCsv(pinout);
    expect(csv).toContain(
      '"\'=HYPERLINK(""https://example.test"")","\'@Bank 1","2","\'+3.3V ""ALT"""',
    );
    expect(csv).toContain('"\'-GPIO4","\'  =1+1 forbidden"');
    expect(csv).toContain('"Connector note: Do not expose this connector to 5 V."');
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });

  it("formats one pin for clipboard use", () => {
    expect(
      pinToText({ position: 3, label: "SDA", role: "i2c", aliases: ["GPIO4"] }),
    ).toBe("Pin 3: SDA (GPIO4) [I2C]");
  });
});

describe("board-aware pin table exports", () => {
  const byId = (id: string) => boards.find((board) => board.id === id)!;

  it("names the board and cites its source so a pasted table stays traceable", () => {
    const pi5 = byId("raspberry-pi-5");
    const markdown = pinoutToMarkdown(pi5.pinout!, pi5);
    const source = primaryExportSource(pi5)!;

    expect(markdown.startsWith(`### Raspberry Pi 5 — ${pi5.pinout!.connector}`)).toBe(true);
    expect(markdown).toContain(`Source: [${source.label}](${source.url})`);
    expect(markdown).toContain("/pinout/raspberry-pi-5");
  });

  it("gives boards that share a connector map distinct CSV filenames", () => {
    const pi4 = byId("raspberry-pi-4-model-b");
    const pi5 = byId("raspberry-pi-5");
    expect(pi4.pinout).toBe(pi5.pinout);
    expect(pinExportFilename(pi4.pinout!, pi4)).not.toBe(
      pinExportFilename(pi5.pinout!, pi5),
    );
    expect(pinExportFilename(pi5.pinout!, pi5)).toMatch(/^raspberry-pi-5-.+\.csv$/);
  });

  it("prefers an official pinout reference over other sources", () => {
    const board: PinExportBoard = {
      id: "test",
      name: "Test",
      vendor: "Raspberry Pi",
      sourceLinks: [
        { label: "Forum", url: "https://example.com/pinout", type: "Pinout" },
        { label: "Docs", url: "https://www.raspberrypi.com/documentation/", type: "Docs" },
        { label: "GPIO", url: "https://www.raspberrypi.com/documentation/gpio", type: "Pinout" },
      ],
    };
    expect(primaryExportSource(board)?.label).toBe("GPIO");
  });

  it("keeps a hostile source label and URL inside one Markdown link", () => {
    const pinout = byId("raspberry-pi-5").pinout!;
    const board: PinExportBoard = {
      id: "test",
      name: "Test | Board",
      vendor: "Nobody",
      sourceLinks: [
        { label: "a](https://evil.test) [b", url: "https://example.com/x (y)", type: "Docs" },
      ],
    };
    const markdown = pinoutToMarkdown(pinout, board);
    expect(markdown).toContain("### Test \\| Board");
    expect(markdown).toContain(
      "Source: [a\\](https://evil.test) \\[b](https://example.com/x%20%28y%29)",
    );
  });

  it("appends a board provenance row to the CSV without changing its columns", () => {
    const pi5 = byId("raspberry-pi-5");
    const lines = pinoutToCsv(pi5.pinout!, pi5).split("\r\n");
    expect(lines[0]).toBe(
      `\uFEFF"Connector","Group","Pin","Signal","Role","Aliases","Note"`,
    );
    expect(lines.at(-1)).toContain('"Board: Raspberry Pi 5 · Source: ');
    expect(lines.at(-1)?.split('","')).toHaveLength(7);
  });
});
