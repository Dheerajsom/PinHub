import { describe, expect, it } from "vitest";
import { boards } from "@/lib/boards";
import { summarizeBoard } from "@/lib/board-summary";
import { createBoardSearchIndex } from "@/lib/board-search";
import { lookupPins, pinMatchKind, matchedPinSignals } from "@/lib/pin-lookup";
import { createPinIndex } from "@/lib/server/pin-index";
import { isPinLikeQuery, matchesPin, matchesSignalValue, pinQueryTokens } from "@/lib/pin-match";
import { parsePinIndex } from "@/lib/pin-index-boundary";
import { GET, POST, OPTIONS } from "@/app/api/pins/route";

const search = createBoardSearchIndex(boards.map(summarizeBoard));
const index = createPinIndex();
describe("pin lookup", () => {
  it("accepts every mapped board's displayed name as a qualifier", () => {
    for (const item of index) {
      const source = boards.find((board) => board.id === item.id)!;
      const role = item.pins.find((pin) => matchesPin(pin, pin.role))!.role;
      for (const name of [source.name, source.name.replaceAll(" ", "")]) {
        expect(lookupPins(`${name} ${role}`, search, index, 512).boards[0]?.id, name).toBe(source.id);
      }
    }
    expect(lookupPins("teensy 3.2 sda1", search, index).boards[0].pins[0].position).toBe(33);
    expect(lookupPins("Teensy 4.0 gpio", search, index).boards[0].id).toBe("teensy-40");
    expect(lookupPins("Teensy 4.1 gpio", search, index).boards[0].id).toBe("teensy-41");
    const plus = lookupPins("Raspberry Pi 3 Model B+ GPIO2", search, index).boards.map((board) => board.id);
    expect(plus).toContain("raspberry-pi-3-model-b-plus");
    expect(plus).not.toContain("raspberry-pi-3-model-b");
    expect(lookupPins("Raspberry Pi 1 Model A+ GPIO2", search, index).boards[0].id).toBe("raspberry-pi-1-model-a-plus");
  });

  it("accepts natural decimal and revision shorthand without weakening variant boundaries", () => {
    for (const [query, id] of [["teensy4.1 i2c", "teensy-41"], ["teensy4.0 i2c", "teensy-40"], ["teensy3.2 sda1", "teensy-32"], ["uno r3 sda", "arduino-uno-rev3"]]) {
      expect(lookupPins(query, search, index).boards[0]?.id, query).toBe(id);
    }
    expect(lookupPins("RaspberryPi3ModelB+ GPIO2", search, index, 512).boards.map((board) => board.id)).toEqual(["raspberry-pi-3-model-b-plus"]);
    expect(lookupPins("RaspberryPi3ModelB GPIO2", search, index, 512).boards.map((board) => board.id)).toEqual(["raspberry-pi-3-model-b"]);
    expect(lookupPins(". gpio", search, index).boards).toEqual([]);
    expect(lookupPins("+ gpio", search, index).boards).toEqual([]);
    expect(lookupPins("+++ gpio", search, index).boards).toEqual([]);
    expect(lookupPins("pi 4 gpio2", search, index, 512).boards.map((board) => board.id)).toEqual(["raspberry-pi-4-model-b"]);
  });

  it("keeps decimal family prefixes and spaced revisions consistent with their recorded names", () => {
    expect(lookupPins("teensy4 i2c", search, index).boards.map((board) => board.id).sort()).toEqual(["teensy-40", "teensy-41"]);
    expect(lookupPins("teensy3 i2c", search, index).boards.map((board) => board.id)).toEqual(["teensy-32"]);
    expect(lookupPins("teensy4.0 i2c", search, index).boards.map((board) => board.id)).toEqual(["teensy-40"]);
    for (const item of index) {
      const source = boards.find((board) => board.id === item.id)!;
      if (!/\b(?:rev|r)\d+\b/i.test(source.name)) continue;
      const role = item.pins.find((pin) => matchesPin(pin, pin.role))!.role;
      for (const prefix of ["rev", "R", "rev.", "R."]) {
        const query = `${source.name.replace(/\b(?:rev|r)(\d+)\b/i, `${prefix} $1`)} ${role}`;
        expect(lookupPins(query, search, index).boards[0]?.id, query).toBe(source.id);
      }
    }
    expect(lookupPins("uno rev 3 sda", search, index).boards[0]?.id).toBe("arduino-uno-rev3");
    expect(lookupPins("rpi5 gpio2", search, index, 512).boards.map((board) => board.id)).toEqual(["raspberry-pi-5"]);
    expect(lookupPins("teensy4.10 i2c", search, index).boards).toEqual([]);
  });

  it("explains every recorded family match and retains source line names", () => {
    for (const board of index) for (const term of ["i2c", "spi", "uart", "pwm", "adc", "dac"]) {
      for (const pin of board.pins.filter((pin) => matchesPin(pin, term))) {
        expect(matchedPinSignals(pin, term), `${board.id} ${pin.label} ${term}`).not.toBe("");
      }
    }
    const teensy = lookupPins("teensy4.1 i2c", search, index).boards[0];
    expect(teensy.pins).toHaveLength(6);
    for (const pin of teensy.pins) expect(matchedPinSignals(pin, "i2c")).toMatch(/SDA|SCL/);
    const uno = lookupPins("uno r3 pwm", search, index).boards[0];
    for (const label of ["D10 / CS", "D11 / COPI"]) {
      const pin = uno.pins.find((pin) => pin.label === label)!;
      expect(matchedPinSignals(pin, "pwm")).toMatch(/PWM TIMER\d [AB]/);
    }
    const secondary = lookupPins("teensy3.2 i2c", search, index).boards[0].pins.find((pin) => pin.position === 33)!;
    expect(matchedPinSignals(secondary, "i2c")).toContain("SDA1");
    expect(matchedPinSignals(secondary, "i2c")).toContain("I2C1");
    const pi = lookupPins("rpi5 sda", search, index).boards[0].pins[0];
    expect(matchedPinSignals(pi, "sda")).toBe("I2C1 SDA");
  });

  it("retains numbered bus identities and explicit TWI context in family queries", () => {
    expect(lookupPins("teensy32 i2c", search, index).boards[0].pins).toHaveLength(4);
    expect(lookupPins("teensy lc uart", search, index).boards[0].pins).toHaveLength(8);
    expect(matchesSignalValue("TWI1_SCK", "i2c")).toBe(true);
    expect(matchesSignalValue("TWI1_SCK", "scl")).toBe(true);
    expect(matchesSignalValue("SCK", "i2c")).toBe(false);
    expect(matchesSignalValue("SPI1_SCK", "scl")).toBe(false);
    expect(matchesSignalValue("CAN1_TX", "uart")).toBe(false);
    expect(matchesPin({ key: "e:1", position: 1, label: "IO34", role: "gpio", flags: ["input-only"], aliases: ["TWI1_SCK"], net: "I2C1" }, "i2c")).toBe(false);
  });
  it("answers recorded aliases, shorthand board names and roles", () => {
    for (const query of ["pico sda", "rpi5 spi", "esp32 gpio27", "uno pwm", "pico gp26"]) {
      expect(lookupPins(query, search, index).boards.length, query).toBeGreaterThan(0);
    }
    const result = lookupPins("pico sda", search, index);
    expect(result.boards[0].id).toBe("raspberry-pi-pico");
    expect(result.boards[0].pins.every((pin) => matchesPin(pin, "sda"))).toBe(true);
  });
  it("keeps exact cross-board labels ambiguous and capped", () => {
    const result = lookupPins("D13", search, index);
    expect(result.boards.length).toBeGreaterThan(1);
    expect(result.boards.length).toBeLessThanOrEqual(8);
    expect(result.boards.flatMap((board) => board.pins).every((pin) => matchesPin(pin, "d13", true))).toBe(true);
    expect(matchesPin({ key: "e:1", position: 1, label: "GP26", role: "gpio" }, "gp2", true)).toBe(false);
  });
  it("retains lower-ranked family variants and discovers recorded alternate signals", () => {
    expect(lookupPins("esp32 gpio27", search, index).boards.map((item) => item.id)).toContain("esp32-devkit-v1");
    const pico = lookupPins("pico sda", search, index).boards.find((item) => item.id === "raspberry-pi-pico")!;
    expect(pico.pins.some((pin) => pin.label === "GP0")).toBe(true);
    expect(pico.pins.some((pin) => pin.label === "GP4")).toBe(true);
    expect(JSON.stringify(index).length).toBeLessThan(2_000_000);
  });
  it("puts source-recorded defaults first and separates chip-only board matches", () => {
    const pico = lookupPins("pico sda", search, index).boards[0];
    expect(pico.pins[0].label).toBe("GP4");
    expect(pinMatchKind(pico.pins[0], "sda")).toBe("default");
    expect(pinMatchKind(pico.pins.find((pin) => pin.label === "GP0")!, "sda")).toBe("alternate");
    expect(lookupPins("rpi5 spi", search, index, 512).boards.map((item) => item.id)).toEqual(["raspberry-pi-5"]);
    expect(lookupPins("uno pwm", search, index, 512).boards.every((item) => /uno/i.test(item.name))).toBe(true);
  });
  it("does not let dense matrix routes consume other boards' result capacity", () => {
    const first = lookupPins("esp32 sda", search, index);
    const all = lookupPins("esp32 sda", search, index, 512);
    expect(first.totalBoards).toBe(all.boards.length);
    expect(first.totalBoards).toBeGreaterThan(first.boards.length);
    expect(all.boards.map((item) => item.id)).toContain("esp32-devkit-v1");
  });
  it("uses the explorer's digital GPIO capability and rejects analog-only alternatives", () => {
    const uno = lookupPins("arduino uno rev3 gpio", search, index).boards[0];
    expect(uno.id).toBe("arduino-uno-rev3");
    expect(uno.pins).toHaveLength(20);
    const nano = index.find((item) => item.id === "arduino-nano")!;
    for (const label of ["A6", "A7"]) expect(matchesPin(nano.pins.find((pin) => pin.label === label)!, "gpio")).toBe(false);
    expect(matchesPin(nano.pins.find((pin) => pin.label === "A6")!, "a6", true)).toBe(true);
    expect(() => parsePinIndex([{ id: "pico", pins: [{ key: "e:1", position: 1, label: "GP0", role: "gpio", gpio: "yes" }] }])).toThrow();
  });
  it("keeps banked GPIO and alias-only capability answers consistent with pin filters", () => {
    expect(lookupPins("orange pi 5 gpio", search, index).boards[0].pins).toHaveLength(17);
    expect(lookupPins("orange pi 5 pwm", search, index).boards[0].pins.map((pin) => pin.position).sort((a, b) => a - b)).toEqual([3, 7, 11, 15, 16, 18, 23, 24, 26]);
    expect(isPinLikeQuery("orange pi 5 GPIO1_B7")).toBe(true);
    expect(lookupPins("orange pi 5 GPIO1_B7", search, index).boards[0].pins[0].label).toBe("GPIO1_B7");
    expect(matchesPin({ key: "e:1", position: 1, label: "GPIO34", role: "gpio", flags: ["input-only"], aliases: ["PWM1", "UART0_TX"] }, "pwm")).toBe(false);
    expect(matchesPin({ key: "e:1", position: 1, label: "ADC_VREF", role: "power" }, "adc")).toBe(false);
    const ordinary = { key: "e:1", position: 1, label: "GPIO4", role: "gpio" as const };
    expect(matchesPin(ordinary, "constructor")).toBe(false);
    expect(matchesPin(ordinary, "__proto__")).toBe(false);
  });
  it("preserves distinct grouped anchor keys, even with reused positions", () => {
    const grouped = index.find((board) => board.pins.some((pin, i) => board.pins.some((other, j) => j !== i && pin.position === other.position)));
    expect(grouped).toBeDefined();
    expect(new Set(grouped!.pins.map((pin) => pin.key)).size).toBe(grouped!.pins.length);
    expect(grouped!.pins.some((pin) => pin.group)).toBe(true);
  });
  it("does not guess, and bounds work on pasted queries", () => {
    expect(lookupPins("pico gpio999", search, index).boards).toEqual([]);
    expect(pinQueryTokens("pico ".repeat(10000))).toHaveLength(32);
    expect(pinQueryTokens("x".repeat(10000))[0]).toHaveLength(256);
    expect(isPinLikeQuery("strap pins")).toBe(false);
    expect(isPinLikeQuery("RP2040")).toBe(false);
    expect(isPinLikeQuery("GP26")).toBe(true);
  });
  it("validates the index and follows catalog API boundaries", async () => {
    expect(parsePinIndex(index)).toEqual(index);
    expect(() => parsePinIndex([{ id: "bad/id", pins: [] }])).toThrow();
    expect(() => parsePinIndex([{ id: "pico", pins: [{ key: "evil" }] }])).toThrow();
    expect(GET(new Request("http://localhost/api/pins?x=1")).status).toBe(400);
    expect(POST().status).toBe(405);
    expect(OPTIONS().headers.get("Allow")).toBe("GET, HEAD, OPTIONS");
    const response = GET(new Request("http://localhost/api/pins"));
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=86400");
    expect(await response.json()).toEqual(index);
  });
});
