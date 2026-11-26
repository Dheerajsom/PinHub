import { describe, expect, it } from "vitest";
import { boards } from "@/lib/boards";
import { buildBoardGeometry, readableDiagramFor } from "@/lib/board-visual-geometry";
import { boardVisuals } from "@/lib/board-visuals";

// The Dynamic pin map's zoomable view used to draw shield headers (Nucleo-64,
// Uno, Mega, the DKs and LaunchPads), the micro:bit's edge fingers and every
// 40-pin header turned 90°, so reading a pin name meant tilting your head.
// Whatever a reader zooms into must read left to right on every board.
const mapped = boards.flatMap((board) => {
  const geometry = buildBoardGeometry(board);
  return geometry ? [{ board, geometry }] : [];
});

describe("readable pin diagrams", () => {
  it("covers the catalog's drawn boards", () => {
    expect(mapped.length).toBeGreaterThan(150);
  });

  it("never draws a sideways label in the zoomable view of any board", () => {
    for (const { board, geometry } of mapped) {
      const zoomable = readableDiagramFor(board, geometry) ?? geometry;
      const sideways = zoomable.anchors.filter((anchor) => anchor.rotateLabel).map((anchor) => anchor.pin.label);
      expect(sideways, board.id).toEqual([]);
    }
  });

  it("keeps the diagram's pads keyed like the board drawing, so selection carries across", () => {
    for (const { board, geometry } of mapped) {
      const diagram = readableDiagramFor(board, geometry);
      if (!diagram) continue;
      const keys = (g: typeof geometry) => g.anchors.map((anchor) => anchor.key).sort();
      expect(keys(diagram), board.id).toEqual(keys(geometry));
      for (const anchor of diagram.anchors) {
        expect(geometry.anchors.find((item) => item.key === anchor.key)?.pin, `${board.id} ${anchor.key}`).toBe(anchor.pin);
      }
    }
  });

  it("lays the Nucleo-F401RE headers out as level columns", () => {
    const board = boards.find((item) => item.id === "stm32-nucleo-f401re")!;
    const diagram = readableDiagramFor(board, buildBoardGeometry(board)!)!;
    expect(diagram).not.toBeNull();
    const digital = diagram.anchors.filter((anchor) => anchor.key.startsWith("g0:"));
    // One column, pin order running down the page, labels to the right.
    expect(new Set(digital.map((anchor) => anchor.cx)).size).toBe(1);
    digital.slice(1).forEach((anchor, i) => expect(anchor.cy).toBeGreaterThan(digital[i].cy));
    for (const anchor of diagram.anchors) {
      expect(anchor.labelY).toBe(anchor.cy);
      expect(anchor.labelX).toBeGreaterThan(anchor.cx);
    }
    // Each connector is titled with its name.
    expect(diagram.silk?.texts.map((text) => text.text)).toEqual(board.pinout!.groups!.slice(0, 2).map((group) => group.label));
  });

  it("wraps a long header into short columns instead of one very tall one", () => {
    const board = boards.find((item) => item.id === "arduino-mega-2560-rev3")!;
    const diagram = readableDiagramFor(board, buildBoardGeometry(board)!)!;
    const digitalColumns = new Set(diagram.anchors.filter((a) => a.key.startsWith("g0:")).map((a) => a.cx));
    expect(digitalColumns.size).toBe(3);
    expect(diagram.vbh / diagram.vbw).toBeLessThan(1.6);
  });

  it("keeps connector columns and titles from overlapping", () => {
    const charted = mapped.filter(({ board }) => ["shield-split", "edge-connector"].includes(boardVisuals[board.id].headerKind));
    expect(charted.length).toBeGreaterThan(25);
    for (const { board, geometry } of charted) {
      const diagram = readableDiagramFor(board, geometry);
      if (!diagram) throw new Error(`${board.id} has no diagram`);
      // Every label's estimated right edge stays on the sheet.
      for (const anchor of diagram.anchors) {
        expect(anchor.labelX + anchor.pin.label.length * 10.4, `${board.id} ${anchor.pin.label}`).toBeLessThanOrEqual(diagram.vbw);
      }
      // Pads of different columns never share a hit area.
      const columns = [...new Set(diagram.anchors.map((anchor) => anchor.cx))].sort((a, b) => a - b);
      columns.slice(1).forEach((cx, i) => expect(cx - columns[i], board.id).toBeGreaterThan(diagram.padR * 4));
    }
  });

  it("keeps the picture-mapped 40-pin boards' pictures and gives them a level diagram", () => {
    for (const id of ["raspberry-pi-5", "orange-pi-5"]) {
      const board = boards.find((item) => item.id === id)!;
      const geometry = buildBoardGeometry(board)!;
      expect(geometry.artworkId ?? geometry.portraitId, id).toBeTruthy();
      expect(geometry.anchors.some((anchor) => anchor.rotateLabel), id).toBe(true);
      expect(readableDiagramFor(board, geometry), id).not.toBeNull();
    }
    // A picture whose labels already read level still zooms itself.
    const pico = boards.find((item) => item.id === "raspberry-pi-pico")!;
    expect(readableDiagramFor(pico, buildBoardGeometry(pico)!)).toBeNull();
  });
});
