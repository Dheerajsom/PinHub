import { describe, expect, it } from "vitest";
import { boards } from "@/lib/boards";
import { boardPortrait, type Part, type PartKind } from "@/lib/board-portraits";
import { boardVisuals } from "@/lib/board-visuals";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";

const stmIds = boards.map((board) => board.id).filter((id) => id.startsWith("stm32") || id.includes("pill-stm32"));
const partsOf = (id: string) => boardPortrait(id)!.parts;
const ofKind = (id: string, ...kinds: PartKind[]) => partsOf(id).filter(([kind]) => kinds.includes(kind));
const box = ([, x, y, w, h]: Part) => ({ x0: x, x1: x + w, y0: y, y1: y + h });
const overlap = (a: Part, b: Part) => {
  const A = box(a), B = box(b);
  return Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0) > 0 && Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0) > 0;
};
const ports: PartKind[] = ["usb", "usb-c", "ethernet", "jack", "microsd"];
const fixtures: PartKind[] = ["header", "header-2x", "hole", "button", "button-blue", "chip", "bga", "crystal"];

describe("STM32 board illustrations", () => {
  it("covers every STM32 board in the catalog", () => {
    expect(stmIds.length).toBeGreaterThanOrEqual(25);
    for (const id of stmIds) expect(boardPortrait(id), id).toBeTruthy();
  });

  it.each(stmIds)("draws no port, header, hole or part of %s on top of another", (id) => {
    const parts = partsOf(id);
    for (const [i, a] of parts.entries()) {
      for (const b of parts.slice(i + 1)) {
        const pair = [a[0], b[0]];
        const relevant = (ports.includes(a[0]) || ports.includes(b[0]) || fixtures.includes(a[0])) &&
          pair.every((kind) => ports.includes(kind) || fixtures.includes(kind));
        if (relevant) expect(overlap(a, b), `${a[0]}@${a[1]},${a[2]} over ${b[0]}@${b[1]},${b[2]}`).toBe(false);
      }
    }
  });

  // UM2407 Figure 4 and Figure 6 (MB1364).
  it("lays out the NUCLEO-H753ZI as the MB1364 top view", () => {
    const id = "stm32-nucleo-h753zi";
    const model = boardPortrait(id)!;
    expect(model.aspect).toBeCloseTo(70 / 133.34, 3);
    // The STLINK-V3E section is part of the board; there is nothing to snap off.
    expect(model.snapOff).toBeUndefined();
    // Bottom edge, left to right: blue USER, user USB, RJ45, black RESET.
    const bottom = partsOf(id).filter(([kind, , y]) => y > 88 && ["button", "button-blue", "usb", "ethernet"].includes(kind));
    expect(bottom.sort((a, b) => a[1] - b[1]).map(([kind]) => kind)).toEqual(["button-blue", "usb", "ethernet", "button"]);
    // The ST-LINK USB sits right of centre on the top edge.
    const stlinkUsb = partsOf(id).find(([kind, , y]) => kind === "usb" && y < 2)!;
    expect(stlinkUsb[1]).toBeGreaterThan(55);
    // Zio sockets are two-row; morpho headers are 2 x 35.
    const doubles = ofKind(id, "header-2x").map((part) => part[5]);
    expect(doubles).toEqual(expect.arrayContaining([8, 15, 10, 17, 35, 35]));
    expect(ofKind(id, "header").every(([, , , , , count]) => (count as number) <= 4)).toBe(true);
    // CN7 (right, 10 rows) starts above CN8 (left, 8 rows); CN9 and CN10 end level.
    const zio = (count: number) => ofKind(id, "header-2x").find((part) => part[5] === count)!;
    expect(zio(10)[2]).toBeLessThan(zio(8)[2]);
    expect(zio(15)[2] + zio(15)[4]).toBeCloseTo(zio(17)[2] + zio(17)[4], 0);
  });

  it("gives every Nucleo-64 the shared shield header frame and colour-coded buttons", () => {
    const nucleo64 = stmIds.filter((id) => id.startsWith("stm32-nucleo-") && boardVisuals[id]?.template === "nucleo-64");
    expect(nucleo64.length).toBeGreaterThanOrEqual(18);
    for (const id of nucleo64) {
      expect(ofKind(id, "header-2x").filter((part) => part[5] === 19), id).toHaveLength(2);
      expect(ofKind(id, "header").map((part) => part[5]), id).toEqual(expect.arrayContaining([8, 6, 10, 8]));
      const blue = ofKind(id, "button-blue");
      const black = ofKind(id, "button");
      expect(blue, id).toHaveLength(1);
      expect(black, id).toHaveLength(1);
      expect(blue[0][1], id).toBeLessThan(black[0][1]);
    }
  });

  it("marks a snap-off line only where the ST-LINK section breaks off", () => {
    expect(boardPortrait("stm32-nucleo-f401re")!.snapOff).toBeCloseTo(29.8);
    expect(boardPortrait("stm32-nucleo-c031c6")!.snapOff).toBeDefined();
    for (const id of ["stm32-nucleo-h503rb", "stm32-nucleo-g474re", "stm32-nucleo-h753zi"]) {
      expect(boardPortrait(id)!.snapOff, id).toBeUndefined();
    }
  });

  it("puts the STM32F4DISCOVERY buttons above its audio jack and OTG port", () => {
    const id = "stm32f4-discovery";
    const [blue] = ofKind(id, "button-blue");
    const [black] = ofKind(id, "button");
    expect(blue[1]).toBeLessThan(black[1]);
    expect(ofKind(id, "jack")[0][2]).toBeGreaterThan(blue[2]);
    expect(ofKind(id, "header-2x").filter((part) => part[5] === 25)).toHaveLength(2);
  });
});

describe("Nucleo-144 Zio connector diagram", () => {
  it("places each Zio header at its measured height", () => {
    const board = boards.find((item) => item.id === "stm32-nucleo-h753zi")!;
    const sheet = buildBoardGeometry(board, { sheet: true })!;
    const firstRow = (designator: string) =>
      Math.min(...sheet.anchors.filter((a) => a.group?.startsWith(designator)).map((a) => a.cy));
    const lastRow = (designator: string) =>
      Math.max(...sheet.anchors.filter((a) => a.group?.startsWith(designator)).map((a) => a.cy));
    const mm = sheet.pitch && (firstRow("CN8 ") - firstRow("CN7 ")) / 9.14;
    // CN7 starts 9.14 mm above CN8, and CN9 ends level with CN10.
    expect(firstRow("CN7 ")).toBeLessThan(firstRow("CN8 "));
    expect(lastRow("CN9 ")).toBeCloseTo(lastRow("CN10 "), -1);
    expect((firstRow("CN10 ") - firstRow("CN7 ")) / mm).toBeCloseTo(59.8 - 32.9, 0);
  });
});
