import { describe, expect, it } from "vitest";
import { boards, normalizeQuery } from "../src/catalog.js";

describe("catalog invariants", () => {
  it("includes the required initial boards", () => {
    const ids = boards.map((b) => b.id);
    expect(ids).toContain("raspberry-pi-5");
    expect(ids).toContain("raspberry-pi-pico");
    expect(ids).toContain("arduino-uno-r3");
    expect(ids).toContain("esp32-devkit-v1");
  });

  it("carries the full website catalog", () => {
    expect(boards.length).toBeGreaterThanOrEqual(125);
    const ids = new Set(boards.map((b) => b.id));
    expect(ids.size).toBe(boards.length);
  });

  it("gives every board at least one source, preferably official", () => {
    for (const board of boards) {
      expect(board.sources.length, board.id).toBeGreaterThanOrEqual(1);
      expect(
        board.sources.some((s) => s.official),
        `${board.id} should cite at least one official source`,
      ).toBe(true);
    }
  });

  it("gives every board at least one warning", () => {
    for (const board of boards) {
      expect(board.warnings.length, board.id).toBeGreaterThanOrEqual(1);
    }
  });

  it("keeps aliases normalized and unique across boards", () => {
    const seen = new Map<string, string>();
    for (const board of boards) {
      for (const alias of [board.id, ...board.aliases]) {
        const normalized = normalizeQuery(alias);
        expect(normalized, `alias "${alias}" on ${board.id}`).toBe(alias);
        const owner = seen.get(normalized);
        expect(
          owner === undefined || owner === board.id,
          `alias "${alias}" is claimed by both ${owner} and ${board.id}`,
        ).toBe(true);
        seen.set(normalized, board.id);
      }
    }
  });

  it("keeps physical pin numbers unique within each header", () => {
    for (const board of boards) {
      for (const header of board.headers) {
        const physical = header.pins.map((p) => p.physical);
        expect(new Set(physical).size, `${board.id}/${header.id}`).toBe(physical.length);
      }
    }
  });

  it("keeps pin grid positions unique and within the declared layout", () => {
    for (const board of boards) {
      for (const header of board.headers) {
        const cells = new Set<string>();
        for (const pin of header.pins) {
          const { row, column } = pin.position;
          expect(row, `${board.id}/${header.id} pin ${pin.physical}`).toBeGreaterThanOrEqual(1);
          expect(row).toBeLessThanOrEqual(header.layout.rows);
          expect(column).toBeGreaterThanOrEqual(1);
          expect(column).toBeLessThanOrEqual(header.layout.columns);
          const key = `${row},${column}`;
          expect(cells.has(key), `${board.id}/${header.id} duplicate cell ${key}`).toBe(false);
          cells.add(key);
        }
      }
    }
  });
});
