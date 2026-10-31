import { describe, expect, it } from "vitest";
import { boards } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { padHitRadius, touchDrawingWidth } from "@/components/board-visual/touch-sizing";

describe("connector touch sizing", () => {
  it("keeps neighboring pin targets separate and at least 44px at working scale", () => {
    for (const board of boards) {
      const geometry = buildBoardGeometry(board, { sheet: true });
      if (!geometry) continue;
      const diameter = padHitRadius(geometry) * 2;
      expect(diameter, board.id).toBeLessThan(geometry.pitch);
      expect(diameter * touchDrawingWidth(geometry) / geometry.vbw, board.id).toBeGreaterThanOrEqual(44);
    }
  });
});
