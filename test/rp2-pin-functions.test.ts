import { describe, expect, it } from "vitest";
import { boards, type Board, type Pin } from "@/lib/boards";
import {
  picoFunctionTable,
  picoRp2Spec,
  rp2BoardSpecs,
  rp2FunctionTable,
} from "@/lib/pin-function-data";
import { planPins } from "@/lib/pin-planner";

// RP2040 and RP2350 planner data is generated from one function-select table
// per chip, so these tests pin the generator to the hand-checked Pico table and
// to the board files it was verified against.

function board(id: string): Board {
  const found = boards.find((item) => item.id === id);
  if (!found) throw new Error(`${id} missing`);
  return found;
}

function pinsOf(target: Board): Pin[] {
  const pinout = target.pinout;
  if (!pinout) return [];
  return pinout.pins
    ? [...pinout.pins.left, ...pinout.pins.right]
    : (pinout.groups ?? []).flatMap((group) => group.pins);
}

function pin(id: string, label: string): Pin {
  const found = pinsOf(board(id)).find((item) => item.label === label);
  if (!found) throw new Error(`${id} has no pin ${label}`);
  return found;
}

const signalsOf = (item: Pin) =>
  (item.functions ?? []).map((fn) => `${fn.instance}.${fn.signal}${fn.default ? "*" : ""}`);

describe("RP2 pin function generator", () => {
  it("reproduces the hand-transcribed Raspberry Pi Pico table exactly", () => {
    expect(rp2FunctionTable(picoRp2Spec)).toEqual(picoFunctionTable);
  });

  it("adds the RP2350's auxiliary UART selects and nothing else", () => {
    const rp2040 = rp2FunctionTable({ ...picoRp2Spec, chip: "RP2040" });
    const rp2350 = rp2FunctionTable({ ...picoRp2Spec, chip: "RP2350" });
    expect(rp2350.GP2.functions?.map((fn) => `${fn.instance}.${fn.signal}`)).toContain("UART0.TX");
    expect(rp2350.GP3.functions?.map((fn) => `${fn.instance}.${fn.signal}`)).toContain("UART0.RX");
    expect(rp2040.GP2.functions?.some((fn) => fn.peripheral === "UART")).toBe(false);
    const withoutUart = (label: string, table: typeof rp2040) =>
      table[label].functions?.filter((fn) => fn.peripheral !== "UART");
    for (const label of Object.keys(rp2040)) {
      expect(withoutUart(label, rp2350), label).toEqual(withoutUart(label, rp2040));
    }
  });

  it("leaves out a bus instance whose signal set is not all on the header", () => {
    // XIAO RP2040: GPIO4 can be UART1 TX, but no UART1 RX pin reaches the edge.
    expect(signalsOf(pin("seeed-xiao-rp2040", "D9 / MISO"))).not.toContain("UART1.TX");
    expect(signalsOf(pin("seeed-xiao-rp2040", "D9 / MISO"))).toContain("SPI0.MISO*");
  });

  it("marks an SDK default only when that whole default bus is on the header", () => {
    // The Pro Micro's default I2C (GPIO16/17) is its Qwiic connector.
    const edgeI2c = pinsOf(board("sparkfun-pro-micro-rp2040")).flatMap((item) =>
      (item.functions ?? []).filter((fn) => fn.peripheral === "I2C" && fn.default),
    );
    expect(edgeI2c).toEqual([]);
    expect(signalsOf(pin("sparkfun-pro-micro-rp2040", "SCK / GP22"))).toContain("SPI0.SCK*");
  });

  it("flags the SDK's LED pin with the header line it comes from", () => {
    expect(pin("adafruit-feather-rp2040", "D13").flags).toEqual(["onboard-led"]);
    expect(board("adafruit-feather-rp2040").pinFunctions?.flagNotes["onboard-led"]).toContain(
      "PICO_DEFAULT_LED_PIN 13",
    );
    expect(pin("adafruit-itsybitsy-rp2040", "D13 / GP11").mcu?.gpio).toBe(11);
    expect(pin("adafruit-itsybitsy-rp2040", "D13 / GP11").flags).toEqual(["onboard-led"]);
  });

  it("plans a Feather RP2040 I2C bus on the SDK's default STEMMA pins", () => {
    const result = planPins(board("adafruit-feather-rp2040"), { I2C: 1 });
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    expect(result.assignments.map((item) => [item.signal, item.pin.label, item.isDefault])).toEqual([
      ["SDA", "SDA", true],
      ["SCL", "SCL", true],
    ]);
  });

  it("names every catalog board it covers, with a GPIO alias the catalog agrees with", () => {
    for (const [id, entry] of Object.entries(rp2BoardSpecs)) {
      for (const [label, gpio] of Object.entries(entry.spec.pins)) {
        const target = pin(id, label);
        expect(target.mcu?.gpio, `${id} ${label}`).toBe(gpio);
        const aliasGpio = [...target.label.split(" / "), ...(target.aliases ?? [])]
          .map((token) => /^GP(?:IO)?(\d+)$/.exec(token))
          .filter((match) => match !== null)
          .map((match) => Number(match[1]));
        // Where the catalog names the GPIO in a label or alias, it must match.
        for (const named of aliasGpio) expect(named, `${id} ${label}`).toBe(gpio);
      }
    }
  });
});

describe("RP2 catalog pin map corrections", () => {
  it("maps the QT Py RP2040's A0 to A3 to GPIO29 down to GPIO26", () => {
    // Adafruit's CircuitPython pins.c and arduino-pico's variant both reverse
    // the order: A0 is GPIO29 (ADC3) and A3 is GPIO26 (ADC0).
    expect(pin("adafruit-qt-py-rp2040", "A0 / D0").aliases).toEqual(["GPIO29", "ADC3"]);
    expect(pin("adafruit-qt-py-rp2040", "A1 / D1").aliases).toEqual(["GPIO28", "ADC2"]);
    expect(pin("adafruit-qt-py-rp2040", "A2 / D2").aliases).toEqual(["GPIO27", "ADC1"]);
    expect(pin("adafruit-qt-py-rp2040", "A3 / D3").aliases).toEqual(["GPIO26", "ADC0"]);
    expect(signalsOf(pin("adafruit-qt-py-rp2040", "A0 / D0"))).toContain("ADC.CH3");
  });

  it("puts the Pro Micro RP2040's SPI edge on GP22, GP20, GP23, and GP21", () => {
    // SparkFun's board file nets: J4 pad 9 22/SPI_SCK, 10 20/SPI_CIPO,
    // 11 23/SPI_COPI, 12 21/SPI_CS.
    const right = board("sparkfun-pro-micro-rp2040").pinout?.pins?.right ?? [];
    expect(right.slice(-4).map((item) => [item.position, item.label])).toEqual([
      [18, "SCK / GP22"],
      [20, "MISO / GP20"],
      [22, "MOSI / GP23"],
      [24, "CS / GP21"],
    ]);
    const text = JSON.stringify(board("sparkfun-pro-micro-rp2040").pinout);
    expect(text).not.toMatch(/onboard (SPI )?flash/i);
  });
});
