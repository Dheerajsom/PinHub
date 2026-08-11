import { describe, expect, it } from "vitest";
import {
  artworkPlacementErrors,
  labelPlacementErrors,
  validateBoardVisuals,
} from "@/lib/board-visual-validation";
import {
  buildBoardGeometry,
  type BoardGeometry,
  type PinAnchor,
} from "@/lib/board-visual-geometry";
import { boards } from "@/lib/boards";
import { wrapStackedLabel } from "@/components/board-visual/label-layout";

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
  it("keeps every character of long schematic labels", () => {
    const label = "VCCIO3/4/5 (TQ144 pins 30, 16, 7)";
    const lines = wrapStackedLabel(label, 190, 14);

    expect(lines).toHaveLength(4);
    expect(lines.join("").replace(/\s/g, "")).toBe(
      label.replace(/[\s/]/g, ""),
    );
  });

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

describe("artworkPlacementErrors", () => {
  it("accepts every board's illustration", () => {
    for (const board of boards) {
      const geometry = buildBoardGeometry(board);
      if (!geometry) continue;
      expect(artworkPlacementErrors(board.id, geometry), board.id).toEqual([]);
    }
  });

  it("catches a connector drawn over the connector's own pads", () => {
    const geometry = geometryFor("raspberry-pi-5");
    const pad = geometry.anchors[0];
    const broken: BoardGeometry = {
      ...geometry,
      ports: [
        {
          kind: "usb-c",
          side: "top",
          x: pad.cx - 40,
          y: pad.cy - 20,
          w: 80,
          h: 40,
        },
      ],
    };
    expect(
      artworkPlacementErrors("broken", broken).some((error) =>
        error.includes("covers pad"),
      ),
    ).toBe(true);
  });

  it("catches a mounting hole drilled through a pad", () => {
    const geometry = geometryFor("raspberry-pi-5");
    const pad = geometry.anchors[3];
    const broken: BoardGeometry = {
      ...geometry,
      holes: [{ x: pad.cx, y: pad.cy, r: 9 }],
    };
    expect(
      artworkPlacementErrors("broken", broken).some((error) =>
        error.includes("drilled through pad"),
      ),
    ).toBe(true);
  });
});
