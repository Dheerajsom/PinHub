import { describe, expect, it } from "vitest";
import { boards } from "@/lib/boards";
import { boardPortrait, type Part, type PartKind } from "@/lib/board-portraits";

// A port drawn over a header, hole, switch or package hides a real feature,
// as the Nucleo-144 RJ45 once hid the end of a Zio header.
const ports = new Set<PartKind>(["usb", "usb-c", "ethernet", "hdmi", "jack", "microsd", "socket", "jst", "jst-sh", "rf-socket", "ribbon"]);
const fixtures = new Set<PartKind>(["header", "header-2x", "hole", "button", "button-blue", "chip", "bga", "memory", "shield", "dip", "crystal", "screen", "lcd", "antenna", "sink"]);
// The XIAO ESP32S3 Sense camera sits on a daughterboard stacked above the module.
const stacked = new Set(["seeed-xiao-esp32s3-sense"]);

const overlapArea = ([, ax, ay, aw, ah]: Part, [, bx, by, bw, bh]: Part) =>
  Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx)) * Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by));

describe("product illustrations", () => {
  it.each(boards.filter((board) => boardPortrait(board.id) && !stacked.has(board.id)).map((board) => board.id))(
    "%s draws no port over a header, hole, switch or package, and no header over a hole or switch",
    (id) => {
      const parts = boardPortrait(id)!.parts;
      const clashes: string[] = [];
      for (const [i, a] of parts.entries()) {
        for (const b of parts.slice(i + 1)) {
          const pair = [a[0], b[0]];
          const portClash = pair.some((kind) => ports.has(kind)) && pair.every((kind) => ports.has(kind) || fixtures.has(kind));
          const headerClash = pair.some((kind) => kind === "header" || kind === "header-2x") &&
            pair.some((kind) => kind === "hole" || kind === "button" || kind === "button-blue");
          if ((portClash || headerClash) && overlapArea(a, b) > 0.25) clashes.push(`${a[0]}@${a[1]},${a[2]} / ${b[0]}@${b[1]},${b[2]}`);
        }
      }
      expect(clashes).toEqual([]);
    },
  );
});
