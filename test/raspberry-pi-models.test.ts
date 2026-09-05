import { describe, expect, it } from "vitest";
import { boards } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { raspberryPiModel, raspberryPiModels } from "@/lib/raspberry-pi-models";

describe("Raspberry Pi illustrations", () => {
  const piBoards = boards.filter((board) => board.id.startsWith("raspberry-pi-"));

  it("covers every Pi in the catalog without affecting other vendors", () => {
    expect(Object.keys(raspberryPiModels).sort()).toEqual(piBoards.map(({ id }) => id).sort());
    expect(raspberryPiModel("constructor")).toBeUndefined();
    expect(buildBoardGeometry(boards.find(({ id }) => id === "arduino-uno-r4-wifi")!)?.artworkId).toBeUndefined();
  });

  it.each(piBoards)("preserves source pins and connector order for $id", (board) => {
    const geometry = buildBoardGeometry(board)!;
    const source = [...(board.pinout?.pins?.left ?? []), ...(board.pinout?.pins?.right ?? []), ...(board.pinout?.groups?.flatMap(({ pins }) => pins) ?? [])];
    expect(geometry.anchors).toHaveLength(source.length);
    expect(new Set(geometry.anchors.map(({ key }) => key)).size).toBe(source.length);
    for (const pin of source) expect(geometry.anchors.find((anchor) => anchor.pin === pin)).toBeDefined();
    const at = (position: number) => geometry.anchors.find(({ pin }) => pin.position === position)!;
    if (raspberryPiModel(board.id)?.family === "pico") {
      expect(at(1).cx).toBeLessThan(at(40).cx);
      expect(at(1).cy).toBe(at(40).cy);
      expect(at(1).cy).toBeLessThan(at(20).cy);
    } else {
      expect(at(1).cx).toBe(at(2).cx);
      expect(at(1).cy).toBeGreaterThan(at(2).cy);
      expect(at(1).cx).toBeLessThan(at(39).cx);
      expect(at(39).cx).toBe(at(40).cx);
    }
    if (raspberryPiModel(board.id)?.family === "keyboard") {
      expect(geometry.notToScale).toBe(true);
      expect(geometry.revisionNote).toContain("not a physical rear-view map");
    }
  });
});
