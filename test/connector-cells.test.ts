import { describe, expect, it } from "vitest";
import { connectorCells, connectorKeyTarget } from "@/components/board-visual/connector-cells";

describe("connector cells", () => {
  it("pairs equal headers row by row", () => {
    expect(connectorCells([1, 3], [2, 4])).toEqual([
      { item: 1, row: 0, col: 0 },
      { item: 2, row: 0, col: 1 },
      { item: 3, row: 1, col: 0 },
      { item: 4, row: 1, col: 1 },
    ]);
  });

  // Pairing by walking the left side alone silently dropped any right-side
  // pins past the left side's length.
  it("keeps every pin of an uneven header in its own column", () => {
    const cells = connectorCells(["L1"], ["R1", "R2", "R3"]);
    expect(cells.map((cell) => cell.item)).toEqual(["L1", "R1", "R2", "R3"]);
    expect(cells.slice(2).every((cell) => cell.col === 1)).toBe(true);
    expect(connectorCells(["L1", "L2"], []).map((cell) => cell.col)).toEqual([0, 0]);
  });

  it("moves by physical row and column and stops at edges and gaps", () => {
    const cells = connectorCells(["L1"], ["R1", "R2"]);
    expect(connectorKeyTarget(cells, 0, "ArrowRight")).toBe(1);
    expect(connectorKeyTarget(cells, 1, "ArrowDown")).toBe(2);
    expect(connectorKeyTarget(cells, 2, "ArrowLeft")).toBe(2); // empty cell opposite
    expect(connectorKeyTarget(cells, 0, "ArrowUp")).toBe(0);
    expect(connectorKeyTarget(cells, 2, "ArrowDown")).toBe(2);
    expect(connectorKeyTarget(cells, 1, "Home")).toBe(0);
    expect(connectorKeyTarget(cells, 0, "End")).toBe(2);
    expect(connectorKeyTarget(cells, 0, "Enter")).toBeNull();
  });
});
