import { describe, expect, it } from "vitest";
import {
  boards,
  type Board,
  type Pin,
  type PinRole,
  type SourceLink,
} from "@/lib/boards";
import { validateBoardSources } from "@/lib/source-trust";

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
  it("keeps at least one official source on every catalog entry", () => {
    expect(validateBoardSources(boards)).toEqual([]);
  });

  it("keeps board identity, search fields, and source metadata valid", () => {
    const ids = new Set<string>();

    for (const board of boards) {
      expect(ids.has(board.id), `duplicate board id ${board.id}`).toBe(false);
      expect(
        board.id,
        `${board.id}.id must be a route-safe kebab-case identifier`,
      ).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      ids.add(board.id);

      for (const field of requiredStringFields) {
        expect(String(board[field]).trim(), `${board.id}.${field} is empty`).not.toBe("");
      }
      expectUniqueStrings(board.tags, `${board.id}.tags`);
      expectUniqueStrings(board.interfaces, `${board.id}.interfaces`);
      expect(board.warnings.length, `${board.id}.warnings`).toBeGreaterThan(0);
      expectUniqueStrings(board.warnings, `${board.id}.warnings`);
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
        expectValidPins(
          [...(pinout.pins?.left ?? []), ...(pinout.pins?.right ?? [])],
          `${board.id}/dual-row`,
        );
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
      // Single-connector boards whose vendor docs publish one flat pin list.
      "flipper-zero": [18],
      "esp32-p4-function-ev-board": [40],
      // Six 12-pin Pmod ports (JA-JF). JF is the PS/MIO-connected port.
      "digilent-zybo-z7-20": [12, 12, 12, 12, 12, 12],
      // Four 12-pin Pmods, then the shield header split by row function.
      "digilent-arty-s7-50": [12, 12, 12, 12, 10, 4, 6, 6, 16, 3, 4, 8],
      "digilent-cmod-a7-35t": [24, 24, 12],
      // Espressif module kits: J1/J3. Counts differ from their DevKitC
      // siblings, which is the whole reason these are separate entries.
      "esp32-c61-devkitc-1": [16, 16],
      "esp8684-devkitm-1": [15, 15],
      "esp32-s3-devkitm-1": [22, 22],
      "esp32-c6-devkitm-1": [15, 15],
      "arduino-nicla-sense-me": [8, 9, 8],
      "milkv-duo-s-v12": [26, 26, 16, 15, 4],
      "esp32-c5-devkitc-1": [16, 16],
    };

    for (const [id, counts] of Object.entries(expectedGroupCounts)) {
      const board = boards.find((candidate) => candidate.id === id);
      expect(board, id).toBeDefined();
      expect(board?.pinout?.layout, id).toBe("grouped");
      expect(board?.pinout?.groups?.map((group) => group.pins.length), id).toEqual(counts);
    }
  });

  it("keeps the revision-scoped ROCK 3A header on its V1.3/V1.31 assignments", () => {
    // Radxa documents two different 40-pin tables for this board. The catalog
    // entry is scoped to V1.3/V1.31, so the pins that differ from V1.2 are the
    // ones worth pinning down: a silent drift back to the V1.2 values would
    // put a signal where this revision has a 3.3 V rail.
    const pinout = boards.find((board) => board.id === "radxa-rock-3a")?.pinout;
    const byPosition = (position: number) =>
      [...(pinout?.pins?.left ?? []), ...(pinout?.pins?.right ?? [])].find(
        (pin) => pin.position === position,
      );

    expect(byPosition(7)?.label).toBe("GPIO0_B5");
    expect(byPosition(16)?.label).toBe("GPIO0_B6");
    expect(byPosition(17)?.label).toBe("+3.3V");
    expect(byPosition(17)?.role).toBe("power");
    expect(byPosition(22)?.label).toBe("GPIO0_C1");
    expect(byPosition(27)?.label).toBe("GPIO0_B4");
    expect(byPosition(28)?.label).toBe("GPIO0_B3");
    expect(byPosition(37)?.label).toBe("SARADC_VIN5");
  });

  it("marks the ESP32-P4 J1 pins that need a board rework as reserved", () => {
    const pinout = boards.find(
      (board) => board.id === "esp32-p4-function-ev-board",
    )?.pinout;
    const pins = pinout?.groups?.[0]?.pins ?? [];
    for (const position of [22, 23, 27, 28, 40]) {
      const pin = pins.find((candidate) => candidate.position === position);
      expect(pin?.role, `J1 pin ${position}`).toBe("reserved");
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
