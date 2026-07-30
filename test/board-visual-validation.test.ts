import { describe, expect, it } from "vitest";
import {
  labelPlacementErrors,
  validateBoardVisuals,
} from "@/lib/board-visual-validation";
import {
  buildBoardGeometry,
  type BoardGeometry,
  type PinAnchor,
} from "@/lib/board-visual-geometry";
import { boards } from "@/lib/boards";

function geometryFor(id: string): BoardGeometry {
  const board = boards.find((entry) => entry.id === id);
  if (!board) throw new Error(`no board ${id}`);
  const geometry = buildBoardGeometry(board);
  if (!geometry) throw new Error(`no geometry for ${id}`);
  return geometry;
}

describe("validateBoardVisuals", () => {
  it("passes for the whole catalog", () => {
    const { errors } = validateBoardVisuals();
    expect(errors).toEqual([]);
  });
});

describe("labelPlacementErrors", () => {
  it("accepts the real layouts", () => {
    for (const id of [
      "raspberry-pi-5", // header2x
      "raspberry-pi-pico", // edge-dual
      "arduino-uno-r4-wifi", // shield-split
      "bbc-microbit-v2", // edge-connector
      "teensy-41", // group-strips
      "lattice-machxo2-breakout", // longest signal names in the catalog
    ]) {
      expect(labelPlacementErrors(id, geometryFor(id)), id).toEqual([]);
    }
  });

  it("catches a rail label aimed back across the pads", () => {
    // The original defect: on a 2xN header the even row's labels were anchored
    // so they grew up out of the rail point, straight over both pad rows.
    const geometry = geometryFor("raspberry-pi-5");
    const broken: BoardGeometry = {
      ...geometry,
      anchors: geometry.anchors.map((anchor): PinAnchor =>
        anchor.side === "bottom"
          ? { ...anchor, labelY: anchor.cy + 30, labelAnchor: "start" }
          : anchor,
      ),
    };
    const errors = labelPlacementErrors("broken", broken);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((error) => error.includes("overlaps pad"))).toBe(true);
  });

  it("catches a label rail too shallow to hold its longest name", () => {
    const geometry = geometryFor("raspberry-pi-pico");
    const broken: BoardGeometry = {
      ...geometry,
      // Collapse the left rail against the sheet edge.
      anchors: geometry.anchors.map((anchor): PinAnchor =>
        anchor.side === "left" ? { ...anchor, labelX: 4 } : anchor,
      ),
    };
    const errors = labelPlacementErrors("broken", broken);
    expect(errors.some((error) => error.includes("outside the sheet"))).toBe(true);
  });
});
