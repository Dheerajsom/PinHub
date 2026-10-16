import { describe, expect, it } from "vitest";
import { benchHeaders, type BenchBoardId } from "@/components/bench-boards";
import { boards, type Pin } from "@/lib/boards";

const strip = (pins: Pin[]) => pins.map(({ label, role }) => ({ label, role }));

describe("background bench boards", () => {
  it.each(Object.keys(benchHeaders) as BenchBoardId[])(
    "%s draws exactly the catalog's header labels and roles",
    (id) => {
      const board = boards.find((candidate) => candidate.id === id);
      expect(board, `${id} is in the catalog`).toBeDefined();
      const pins = board!.pinout?.pins;
      expect(pins, `${id} has a dual-row pin map`).toBeDefined();
      expect(benchHeaders[id].left).toEqual(strip(pins!.left));
      expect(benchHeaders[id].right).toEqual(strip(pins!.right));
    },
  );
});
