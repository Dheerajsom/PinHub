import { describe, expect, it } from "vitest";
import {
  boards,
  type Board,
  type Pin,
  type PinFlag,
  type PinPeripheral,
} from "@/lib/boards";
import { isSafeExternalUrl } from "@/lib/source-trust";

// Integrity gate for the pin planner's peripheral data. The planner assigns
// real wires from these rows, so a gap (SDA without SCL, a function on a power
// pin, a flag without its quoted reason) must fail the build, not a user.

const pilotIds = [
  "arduino-uno-rev3",
  "esp32-devkitc",
  "raspberry-pi-5",
  "raspberry-pi-pico",
];

const busSignals: Partial<Record<PinPeripheral, string[]>> = {
  I2C: ["SDA", "SCL"],
  UART: ["TX", "RX"],
  CAN: ["TX", "RX"],
  SPI: ["SCK", "MOSI", "MISO"],
};
const isChipSelect = (signal: string) => /^CS\d*$/.test(signal);
const nonAssignableRoles = new Set(["power", "ground", "reserved"]);

function pinsOf(board: Board): Pin[] {
  const pinout = board.pinout;
  if (!pinout) return [];
  return pinout.pins
    ? [...pinout.pins.left, ...pinout.pins.right]
    : (pinout.groups ?? []).flatMap((group) => group.pins);
}

const withData = boards.filter((board) => board.pinFunctions);

describe("pin function data", () => {
  it("covers exactly the pilot boards", () => {
    expect(withData.map((board) => board.id).sort()).toEqual(pilotIds);
  });

  it("only appears on boards that carry its sources", () => {
    for (const board of boards) {
      if (board.pinFunctions) continue;
      for (const pin of pinsOf(board)) {
        expect(pin.functions, `${board.id} ${pin.label}`).toBeUndefined();
        expect(pin.flags, `${board.id} ${pin.label}`).toBeUndefined();
        expect(pin.mcu, `${board.id} ${pin.label}`).toBeUndefined();
      }
    }
  });

  for (const board of withData) {
    const data = board.pinFunctions!;
    const pins = pinsOf(board);

    describe(board.id, () => {
      it("cites safe, distinct sources", () => {
        expect(data.sources.length).toBeGreaterThan(0);
        const urls = data.sources.map((source) => source.url);
        expect(new Set(urls).size).toBe(urls.length);
        for (const url of urls) expect(isSafeExternalUrl(url), url).toBe(true);
        expect(data.mux.note.trim().length).toBeGreaterThan(0);
      });

      it("names only peripherals the board lists as interfaces", () => {
        const interfaces = new Set<string>(board.interfaces);
        for (const pin of pins) {
          for (const item of pin.functions ?? []) {
            expect(interfaces.has(item.peripheral), `${pin.label} ${item.peripheral}`).toBe(true);
          }
        }
        for (const routable of data.mux.routable ?? []) {
          expect(interfaces.has(routable.peripheral), routable.peripheral).toBe(true);
        }
        if (data.mux.model === "fixed") expect(data.mux.routable).toBeUndefined();
      });

      it("never puts a function, flag, or GPIO identity on power, ground, or reserved pins", () => {
        for (const pin of pins) {
          if (!nonAssignableRoles.has(pin.role)) continue;
          expect(pin.functions, pin.label).toBeUndefined();
          expect(pin.flags, pin.label).toBeUndefined();
          expect(pin.mcu, pin.label).toBeUndefined();
        }
      });

      it("gives every pin with functions or flags a unique GPIO identity", () => {
        const names = new Set<string>();
        const numbers = new Set<number>();
        for (const pin of pins) {
          if (pin.functions || pin.flags) expect(pin.mcu, pin.label).toBeDefined();
          if (!pin.mcu) continue;
          expect(names.has(pin.mcu.name), pin.mcu.name).toBe(false);
          names.add(pin.mcu.name);
          if (pin.mcu.gpio !== undefined) {
            expect(Number.isSafeInteger(pin.mcu.gpio) && pin.mcu.gpio >= 0).toBe(true);
            expect(numbers.has(pin.mcu.gpio), pin.mcu.name).toBe(false);
            numbers.add(pin.mcu.gpio);
          }
        }
        expect(names.size).toBeGreaterThan(0);
      });

      it("completes every bus instance's signal set", () => {
        const signals = new Map<string, Set<string>>();
        for (const pin of pins) {
          for (const item of pin.functions ?? []) {
            expect(item.instance, pin.label).toMatch(/^[A-Za-z][A-Za-z0-9_]*$/);
            expect(item.signal, pin.label).toMatch(/^[A-Z0-9]+$/);
            if (!busSignals[item.peripheral]) continue;
            const key = `${item.peripheral}:${item.instance}`;
            signals.set(key, (signals.get(key) ?? new Set()).add(item.signal));
          }
        }
        for (const [key, present] of signals) {
          const peripheral = key.split(":")[0] as PinPeripheral;
          for (const signal of busSignals[peripheral]!) {
            expect(present.has(signal), `${key} lacks ${signal}`).toBe(true);
          }
          if (peripheral === "SPI") {
            expect([...present].some(isChipSelect), `${key} lacks a chip select`).toBe(true);
          }
        }
        for (const routable of data.mux.routable ?? []) {
          const required = busSignals[routable.peripheral];
          if (!required) continue;
          for (const signal of required) expect(routable.signals).toContain(signal);
          if (routable.peripheral === "SPI") {
            expect(routable.signals.some(isChipSelect)).toBe(true);
          }
        }
      });

      it("marks at most one default pin per signal", () => {
        const seen = new Set<string>();
        for (const pin of pins) {
          for (const item of pin.functions ?? []) {
            if (!item.default) continue;
            const key = `${item.instance}:${item.signal}`;
            expect(seen.has(key), key).toBe(false);
            seen.add(key);
          }
        }
      });

      it("quotes a source-backed reason for every flag it uses", () => {
        const used = new Set<PinFlag>(pins.flatMap((pin) => pin.flags ?? []));
        for (const flag of used) {
          expect(data.flagNotes[flag]?.trim(), flag).toBeTruthy();
        }
        for (const flag of Object.keys(data.flagNotes)) {
          expect(used.has(flag as PinFlag), `unused note ${flag}`).toBe(true);
        }
      });

      it("offers only exports whose pin naming the data supports", () => {
        const identified = pins.filter((pin) => pin.mcu);
        expect(data.exports).toContain("json");
        if (data.exports.includes("micropython")) {
          for (const pin of identified) expect(pin.mcu!.gpio, pin.label).toBeDefined();
          const instances = new Set(
            pins.flatMap((pin) =>
              (pin.functions ?? [])
                .filter((item) => busSignals[item.peripheral])
                .map((item) => item.instance),
            ),
          );
          for (const routable of data.mux.routable ?? []) {
            if (busSignals[routable.peripheral]) {
              routable.instances.forEach((instance) => instances.add(instance));
            }
          }
          for (const instance of instances) {
            expect(data.micropythonBusIds?.[instance], instance).toBeDefined();
          }
        } else {
          expect(data.micropythonBusIds).toBeUndefined();
        }
        if (data.exports.includes("arduino")) {
          for (const pin of identified) expect(pin.mcu!.arduino, pin.label).toBeTruthy();
        }
        if (data.exports.includes("c-header")) {
          for (const pin of identified) {
            expect(
              pin.mcu!.gpio !== undefined || /^P[A-Z][0-7]$/.test(pin.mcu!.name),
              pin.label,
            ).toBe(true);
          }
        }
      });
    });
  }
});

describe("pilot rows match their sources", () => {
  const pin = (boardId: string, label: string) =>
    pinsOf(boards.find((board) => board.id === boardId)!).find(
      (item) => item.label === label,
    )!;
  const has = (item: Pin, peripheral: string, instance: string, signal: string) =>
    (item.functions ?? []).some(
      (fn) => fn.peripheral === peripheral && fn.instance === instance && fn.signal === signal,
    );

  it("Pico: pico.h defaults and ADC inputs from adc.h", () => {
    expect(pin("raspberry-pi-pico", "GP4").functions).toContainEqual({
      peripheral: "I2C", instance: "I2C0", signal: "SDA", default: true,
    });
    expect(pin("raspberry-pi-pico", "GP19").functions).toContainEqual({
      peripheral: "SPI", instance: "SPI0", signal: "MOSI", default: true,
    });
    expect(has(pin("raspberry-pi-pico", "GP26"), "ADC", "ADC", "CH0")).toBe(true);
    expect(has(pin("raspberry-pi-pico", "GP28"), "ADC", "ADC", "CH2")).toBe(true);
    // GP0 and GP16 share PWM slice 0 output A in io_bank0.h.
    expect(has(pin("raspberry-pi-pico", "GP0"), "PWM", "PWM0", "A")).toBe(true);
    expect(has(pin("raspberry-pi-pico", "GP16"), "PWM", "PWM0", "A")).toBe(true);
  });

  it("ESP32-DevKitC: fixed ADC and DAC, input-only and strapping flags", () => {
    expect(pin("esp32-devkitc", "VP").mcu?.gpio).toBe(36);
    expect(pin("esp32-devkitc", "VP").flags).toContain("input-only");
    expect(has(pin("esp32-devkitc", "IO25"), "DAC", "DAC", "CH1")).toBe(true);
    for (const label of ["IO0", "IO2", "IO5", "IO12", "IO15"]) {
      expect(pin("esp32-devkitc", label).flags, label).toContain("strapping");
    }
  });

  it("UNO Rev3: Serial on D0/D1, Wire on A4/A5, PWM on 3/5/6/9/10/11", () => {
    expect(has(pin("arduino-uno-rev3", "D1 / TX"), "UART", "Serial", "TX")).toBe(true);
    expect(has(pin("arduino-uno-rev3", "A4 / SDA"), "I2C", "Wire", "SDA")).toBe(true);
    const pwm = pinsOf(boards.find((board) => board.id === "arduino-uno-rev3")!)
      .filter((item) => item.functions?.some((fn) => fn.peripheral === "PWM"))
      .map((item) => item.mcu!.arduino);
    expect(pwm).toEqual(["3", "5", "6", "9", "10", "11"]);
  });

  it("Raspberry Pi 5: the documented header functions only", () => {
    expect(has(pin("raspberry-pi-5", "GPIO2"), "I2C", "I2C1", "SDA")).toBe(true);
    expect(has(pin("raspberry-pi-5", "GPIO14"), "UART", "UART0", "TX")).toBe(true);
    const pwm = pinsOf(boards.find((board) => board.id === "raspberry-pi-5")!)
      .filter((item) => item.functions?.some((fn) => fn.peripheral === "PWM"))
      .map((item) => item.mcu!.gpio);
    expect(pwm.sort((a, b) => a! - b!)).toEqual([12, 13, 18, 19]);
    expect(pin("raspberry-pi-5", "GPIO0").mcu).toBeUndefined();
  });
});
