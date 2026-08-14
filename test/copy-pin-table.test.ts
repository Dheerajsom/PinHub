import { describe, expect, it } from "vitest";
import { pinoutToMarkdown } from "@/components/CopyPinTable";
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
});
