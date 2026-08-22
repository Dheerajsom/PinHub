import { describe, expect, it } from "vitest";
import { pinoutToCsv, pinoutToMarkdown } from "@/components/CopyPinTable";
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

  it("exports spreadsheet-safe CSV with connector groups and escaped cells", () => {
    const pinout: Pinout = {
      connector: "Header A",
      layout: "grouped",
      notes: [],
      groups: [{
        label: "Bank 1",
        pins: [{ position: 2, label: 'SDA "ALT"', role: "i2c", aliases: ["GPIO4"] }],
      }],
    };
    const csv = pinoutToCsv(pinout);
    expect(csv).toContain('"Header A","Bank 1","2","SDA ""ALT"""');
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });

  it("formats one pin for clipboard use", () => {
    expect(
      pinToText({ position: 3, label: "SDA", role: "i2c", aliases: ["GPIO4"] }),
    ).toBe("Pin 3: SDA (GPIO4) [I2C]");
  });
});
