import { describe, expect, it } from "vitest";
import {
  boards,
  type Board,
  type Pin,
  type PinRole,
  type SourceLink,
} from "@/lib/boards";

const pinRoles = new Set<PinRole>([
  "power",
  "ground",
  "gpio",
  "i2c",
  "spi",
  "uart",
  "adc",
  "dac",
  "pwm",
  "debug",
  "system",
  "special",
  "reserved",
]);

const sourceTypes = new Set<SourceLink["type"]>([
  "Docs",
  "Pinout",
  "Datasheet",
  "Schematic",
  "Manual",
]);

const requiredStringFields = [
  "id",
  "name",
  "vendor",
  "family",
  "processor",
  "logicLevel",
  "power",
  "formFactor",
  "description",
] as const satisfies readonly (keyof Board)[];

function expectUniqueStrings(values: readonly string[], context: string) {
  for (const value of values) {
    expect(value.trim(), `${context} contains an empty value`).not.toBe("");
  }
  expect(new Set(values).size, `${context} contains duplicates`).toBe(values.length);
}

function expectValidPins(pins: readonly Pin[], context: string) {
  const positions = new Set<number>();
  for (const pin of pins) {
    expect(Number.isInteger(pin.position), `${context}/${pin.label} position`).toBe(true);
    expect(pin.position, `${context}/${pin.label} position`).toBeGreaterThan(0);
    expect(positions.has(pin.position), `${context} repeats position ${pin.position}`).toBe(false);
    positions.add(pin.position);
    expect(pin.label.trim(), `${context} has an empty pin label`).not.toBe("");
    expect(pinRoles.has(pin.role), `${context}/${pin.label} has invalid role`).toBe(true);
    if (pin.aliases) expectUniqueStrings(pin.aliases, `${context}/${pin.label} aliases`);
  }
}

describe("board catalog integrity", () => {
  it("keeps board identity, search fields, and source metadata valid", () => {
    const ids = new Set<string>();

    for (const board of boards) {
      expect(ids.has(board.id), `duplicate board id ${board.id}`).toBe(false);
      ids.add(board.id);

      for (const field of requiredStringFields) {
        expect(String(board[field]).trim(), `${board.id}.${field} is empty`).not.toBe("");
      }
      expectUniqueStrings(board.tags, `${board.id}.tags`);
      expectUniqueStrings(board.interfaces, `${board.id}.interfaces`);
      expect(board.sourceLinks.length, `${board.id}.sourceLinks`).toBeGreaterThan(0);

      for (const source of board.sourceLinks) {
        expect(source.label.trim(), `${board.id} has an empty source label`).not.toBe("");
        const parsed = new URL(source.url);
        expect(parsed.protocol, `${board.id}/${source.label} must use HTTPS`).toBe("https:");
        expect(sourceTypes.has(source.type), `${board.id}/${source.label} has invalid type`).toBe(true);
      }
    }
  });

  it("keeps every represented connector complete and internally consistent", () => {
    for (const board of boards) {
      const pinout = board.pinout;
      if (!pinout) continue;

      expect(pinout.connector.trim(), `${board.id} connector label`).not.toBe("");
      expect(pinout.notes.length, `${board.id} pinout notes`).toBeGreaterThan(0);
      expectUniqueStrings(pinout.notes, `${board.id} pinout notes`);

      if (pinout.layout === "dual-row") {
        expect(pinout.pins, `${board.id} dual-row pins`).toBeDefined();
        expect(pinout.pins?.left.length, `${board.id} left row`).toBeGreaterThan(0);
        expect(pinout.pins?.right.length, `${board.id} right row`).toBeGreaterThan(0);
        expectValidPins(pinout.pins?.left ?? [], `${board.id}/left`);
        expectValidPins(pinout.pins?.right ?? [], `${board.id}/right`);
      } else {
        expect(pinout.groups?.length, `${board.id} grouped pinout`).toBeGreaterThan(0);
        const groupLabels = pinout.groups?.map((group) => group.label) ?? [];
        expectUniqueStrings(groupLabels, `${board.id} group labels`);
        for (const group of pinout.groups ?? []) {
          expect(group.pins.length, `${board.id}/${group.label}`).toBeGreaterThan(0);
          expectValidPins(group.pins, `${board.id}/${group.label}`);
        }
      }
    }
  });

  it("matches the cited connector counts for the newly researched boards", () => {
    const expectedGroupCounts: Record<string, number[]> = {
      "nxp-frdm-kl25z": [16, 20, 16, 12],
      "digilent-nexys-a7-100t": [12, 12, 12, 12, 12],
      "terasic-de10-lite": [40, 8, 10, 8, 6],
    };

    for (const [id, counts] of Object.entries(expectedGroupCounts)) {
      const board = boards.find((candidate) => candidate.id === id);
      expect(board, id).toBeDefined();
      expect(board?.pinout?.layout, id).toBe("grouped");
      expect(board?.pinout?.groups?.map((group) => group.pins.length), id).toEqual(counts);
    }
  });

  it("retains reference identity for intentionally shared connector maps", () => {
    const byId = (id: string) => boards.find((board) => board.id === id)?.pinout;
    expect(byId("raspberry-pi-4-model-b")).toBe(byId("raspberry-pi-5"));
    expect(byId("raspberry-pi-zero-2-w")).toBe(byId("raspberry-pi-5"));
    expect(byId("raspberry-pi-pico-w")).toBe(byId("raspberry-pi-pico"));
    expect(byId("raspberry-pi-pico-2")).toBe(byId("raspberry-pi-pico"));
    expect(byId("stm32-nucleo-f103rb")).toBe(byId("stm32-nucleo-f401re"));
  });
});
