import { describe, expect, it } from "vitest";
import { boards as websiteBoards } from "../../src/lib/boards";
import { boards, normalizeQuery } from "../src/catalog.js";

describe("catalog invariants", () => {
  it("includes the required initial boards", () => {
    const ids = boards.map((b) => b.id);
    expect(ids).toContain("raspberry-pi-5");
    expect(ids).toContain("raspberry-pi-pico");
    expect(ids).toContain("arduino-uno-rev3");
    expect(ids).toContain("esp32-devkit-v1");
    expect(ids).toContain("esp32-devkitc");
  });

  it("carries the full website catalog", () => {
    expect(boards.length).toBe(websiteBoards.length);
    const ids = new Set(boards.map((b) => b.id));
    expect(ids.size).toBe(boards.length);
    expect(ids).toEqual(new Set(websiteBoards.map((board) => board.id)));
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
        expect(
          alias,
          `alias "${alias}" on ${board.id} must be a shell-safe kebab-case token`,
        ).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
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

  it("keeps the ESP32 GPIO15 boot-log strap guidance electrically correct", () => {
    const board = boards.find((candidate) => candidate.id === "esp32-devkit-v1");
    const pin = board?.headers
      .flatMap((header) => header.pins)
      .find((candidate) => candidate.gpio === "GPIO15");
    expect(pin?.notes?.join(" ")).toContain("pull low");
    expect(pin?.notes?.join(" ")).not.toContain("keep high");
  });

  it("retains the early ESP32-DevKitC V4 revision warning", () => {
    const board = boards.find((candidate) => candidate.id === "esp32-devkitc");
    expect(board?.warnings.map((warning) => warning.text).join(" ")).toContain(
      "C15",
    );
  });
});
