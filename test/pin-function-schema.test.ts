import { describe, expect, it } from "vitest";
import { boards, type Board } from "@/lib/boards";
import { isBoardPayload } from "@/lib/board-detail-loader";

// /api/boards/[id] serves full records, including the pin planner fields, to
// the catalog's detail panel. The same validator that guards the rest of the
// record must accept real data and reject malformed or oversized planner data.

function payload(id: string): Record<string, unknown> {
  const board = boards.find((item) => item.id === id);
  if (!board) throw new Error(`${id} missing`);
  return JSON.parse(JSON.stringify(board));
}

type MutablePayload = {
  pinFunctions?: Record<string, unknown>;
  pinout: { pins?: { left: Record<string, unknown>[] }; groups?: { pins: Record<string, unknown>[] }[] };
};

function firstPin(record: Record<string, unknown>): Record<string, unknown> {
  const pinout = (record as MutablePayload).pinout;
  return pinout.pins ? pinout.pins.left[0] : pinout.groups![0].pins[0];
}

describe("board payload validation with pin planner fields", () => {
  it("accepts every catalog record after a JSON round trip", () => {
    for (const board of boards) {
      expect(isBoardPayload(JSON.parse(JSON.stringify(board)), board.id), board.id).toBe(true);
    }
  });

  it("rejects planner fields on pins without the board-level sources", () => {
    const record = payload("raspberry-pi-pico");
    delete (record as MutablePayload).pinFunctions;
    expect(isBoardPayload(record, "raspberry-pi-pico")).toBe(false);

    const plain = payload("raspberry-pi-4-model-b");
    firstPin(plain).functions = [{ peripheral: "I2C", instance: "I2C1", signal: "SDA" }];
    expect(isBoardPayload(plain, "raspberry-pi-4-model-b")).toBe(false);
  });

  const invalidPins: [string, (pin: Record<string, unknown>) => void][] = [
    ["an unknown peripheral", (pin) => { pin.functions = [{ peripheral: "USB", instance: "USB0", signal: "DP" }]; }],
    ["a markup instance", (pin) => { pin.functions = [{ peripheral: "I2C", instance: "<img>", signal: "SDA" }]; }],
    ["a lowercase signal", (pin) => { pin.functions = [{ peripheral: "I2C", instance: "I2C0", signal: "sda" }]; }],
    ["too many functions", (pin) => {
      pin.functions = Array.from({ length: 17 }, (_, index) => ({ peripheral: "PWM", instance: `PWM${index}`, signal: "A" }));
    }],
    ["duplicate functions", (pin) => {
      pin.functions = [
        { peripheral: "I2C", instance: "I2C0", signal: "SDA" },
        { peripheral: "I2C", instance: "I2C0", signal: "SDA" },
      ];
    }],
    ["a non-true default", (pin) => { pin.functions = [{ peripheral: "I2C", instance: "I2C0", signal: "SDA", default: false }]; }],
    ["an unknown flag", (pin) => { pin.flags = ["cursed"]; }],
    ["a GPIO number out of range", (pin) => { pin.mcu = { name: "GPIO0", gpio: 999 }; }],
    ["an overlong GPIO name", (pin) => { pin.mcu = { name: "G".repeat(40) }; }],
  ];
  for (const [label, mutate] of invalidPins) {
    it(`rejects a pin with ${label}`, () => {
      const record = payload("raspberry-pi-pico");
      mutate(firstPin(record));
      expect(isBoardPayload(record, "raspberry-pi-pico")).toBe(false);
    });
  }

  const invalidData: [string, (data: Record<string, unknown>) => void][] = [
    ["no sources", (data) => { data.sources = []; }],
    ["an insecure source", (data) => {
      data.sources = [{ label: "Header", url: "http://example.com/io_bank0.h", type: "Docs" }];
    }],
    ["an unknown mux model", (data) => { data.mux = { model: "magic", note: "x" }; }],
    ["routing on a fixed mux", (data) => {
      data.mux = { model: "fixed", note: "x", routable: [{ peripheral: "I2C", instances: ["I2C0"], signals: ["SDA", "SCL"] }] };
    }],
    ["an overlong mux note", (data) => { data.mux = { model: "fixed", note: "x".repeat(601) }; }],
    ["a note for an unknown flag", (data) => { data.flagNotes = { cursed: "Beware." }; }],
    ["an unknown export format", (data) => { data.exports = ["json", "zephyr"]; }],
    ["a negative MicroPython bus id", (data) => { data.micropythonBusIds = { I2C0: -1 }; }],
  ];
  for (const [label, mutate] of invalidData) {
    it(`rejects pin function data with ${label}`, () => {
      const record = payload("raspberry-pi-pico") as { pinFunctions: Record<string, unknown> };
      mutate(record.pinFunctions);
      expect(isBoardPayload(record, "raspberry-pi-pico")).toBe(false);
    });
  }

  it("keeps planner data on the four pilot boards only", () => {
    const pilots = boards.filter((board: Board) => board.pinFunctions).map((board) => board.id);
    expect(pilots.sort()).toEqual(["arduino-uno-rev3", "esp32-devkitc", "raspberry-pi-5", "raspberry-pi-pico"]);
  });
});
