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

  it("exports formula-safe CSV with connector groups and escaped cells", () => {
    const pinout: Pinout = {
      connector: "=HYPERLINK(\"https://example.test\")",
      layout: "grouped",
      notes: [],
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
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });

  it("formats one pin for clipboard use", () => {
    expect(
      pinToText({ position: 3, label: "SDA", role: "i2c", aliases: ["GPIO4"] }),
    ).toBe("Pin 3: SDA (GPIO4) [I2C]");
  });
});
