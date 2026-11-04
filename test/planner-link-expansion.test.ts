import { describe, expect, it } from "vitest";
import { boards, type Board, type Pin } from "@/lib/boards";
import { boardVisuals } from "@/lib/board-visuals";
import { buildBoardLink, busSignalsForPin, linkPorts } from "@/lib/board-link";
import { planCapabilities, planPins } from "@/lib/pin-planner";
import { planExports } from "@/lib/pin-plan-export";
import { isPinFunctionData } from "@/lib/pin-function-schema";

// Pins the October 2026 planner and board link expansion to its sources. The
// expected rows are the ones the core variant files, CircuitPython pins.c, and
// vendor board files state, so a later edit cannot quietly move a pin.

function board(id: string): Board {
  const found = boards.find((item) => item.id === id);
  if (!found) throw new Error(`${id} missing`);
  return found;
}

function pins(item: Board): Pin[] {
  const pinout = item.pinout;
  if (!pinout) return [];
  return pinout.pins
    ? [...pinout.pins.left, ...pinout.pins.right]
    : (pinout.groups ?? []).flatMap((group) => group.pins);
}

function pin(id: string, label: string): Pin {
  const found = pins(board(id)).find((item) => item.label === label);
  if (!found) throw new Error(`${id} has no pin ${label}`);
  return found;
}

const tokens = (item: Pin) =>
  (item.functions ?? []).map((fn) => `${fn.instance}.${fn.signal}${fn.default ? "*" : ""}`);

const uartCount = (id: string) => linkPorts(board(id), "uart").filter((port) => port.complete).length;
const i2cCount = (id: string) => linkPorts(board(id), "i2c").filter((port) => port.complete).length;

const newIds = [
  "stm32-nucleo-f411re", "stm32-nucleo-f072rb", "stm32-nucleo-f091rc", "stm32-nucleo-f303re",
  "stm32-nucleo-f334r8", "stm32-nucleo-g431rb", "stm32-nucleo-g474re", "stm32-nucleo-g0b1re",
  "stm32-nucleo-c031c6", "stm32-nucleo-l053r8", "stm32-nucleo-l073rz", "stm32-nucleo-l152re",
  "stm32-nucleo-h503rb", "stm32-nucleo-l432kc", "stm32-nucleo-g431kb", "stm32-nucleo-f303k8",
  "raspberry-pi-3-model-b", "raspberry-pi-1-model-a-plus", "adafruit-feather-rp2350",
  "adafruit-kb2040", "waveshare-rp2350-plus", "waveshare-rp2350-zero",
  "adafruit-feather-esp32-v2", "adafruit-feather-esp32-s2", "adafruit-qt-py-esp32-s2",
  "adafruit-feather-m0-express", "arduino-nano-33-ble", "arduino-nano-33-ble-sense-rev2",
  "arduino-mkr-1000-wifi", "sparkfun-redboard-qwiic", "sparkfun-pro-micro",
  "seeed-xiao-esp32s3-sense", "seeed-xiao-nrf52840-sense", "libre-computer-alta",
  "libre-computer-solitude", "libre-computer-tritium-h5", "orange-pi-zero-2w", "orange-pi-3b",
  "orange-pi-5-plus",
];

describe("boards added in the expansion", () => {
  it.each(["orange-pi-zero-2w", "orange-pi-3b"])("discloses what stays unverified on %s", (id) => {
    const item = board(id);
    // First caution remains visible even when a catalog panel folds its list.
    expect(item.warnings[0]).toMatch(/^Unverified pin/);
    expect(item.warnings[0]).toMatch(/exact board revision before wiring/);
    expect(item.pinout?.notes).toContain(item.warnings[0]);
    const link = buildBoardLink(item, board("raspberry-pi-pico"), "uart");
    expect(link.notes).toContain(`${item.name}: ${item.warnings[0]}`);
    const [claimed] = pins(item).filter((pin) => pin.role === "gpio");
    const exports = planExports(item, [], "2026-10-31", [{ name: "LED", pin: claimed, cautions: [] }]);
    expect(exports.map((file) => file.format)).toContain("csv");
    expect(exports.map((file) => file.format)).toContain("json");
    for (const file of exports) expect(file.text, file.format).toContain(item.warnings[0]);
  });

  it("are all in the catalog with a pin map and a diagram", () => {
    for (const id of newIds) {
      expect(board(id).pinout, id).toBeDefined();
      expect(boardVisuals[id], id).toBeDefined();
    }
  });

  it("give every MCU board and Raspberry Pi planner data", () => {
    const sbcOnly = /^(libre-computer|orange-pi)-/;
    for (const id of newIds.filter((item) => !sbcOnly.test(item))) {
      expect(isPinFunctionData(board(id).pinFunctions), id).toBe(true);
    }
  });

  it("maps a Nucleo-64 through its variant, not a shared assumption", () => {
    // G431RB moves D0/D1 to PC5/PC4 and D6 stays PB10; H503RB moves D0, D1, D14, and D15.
    expect(pin("stm32-nucleo-g431rb", "D0").mcu?.name).toBe("PC5");
    expect(pin("stm32-nucleo-h503rb", "D0").mcu?.name).toBe("PB15");
    expect(pin("stm32-nucleo-h503rb", "D14 / SDA").mcu?.name).toBe("PB7");
    expect(pin("stm32-nucleo-f401re", "D0").mcu?.name).toBe("PA3");
    expect(tokens(pin("stm32-nucleo-f401re", "D0"))).toContain("USART2.RX*");
    expect(pin("stm32-nucleo-f401re", "D0").flags).toEqual(["usb"]);
  });

  it("records the Zephyr disagreement on the Nucleo-F303RE header", () => {
    expect(pin("stm32-nucleo-f303re", "D11").mcu?.name).toBe("PA7");
    expect(board("stm32-nucleo-f303re").warnings.join(" ")).toMatch(/PB15, PB14, and PB13/);
  });

  it("follows the Feather RP2350's board file, where D13 is not GPIO13", () => {
    expect(pin("adafruit-feather-rp2350", "D13").mcu?.gpio).toBe(7);
    expect(pin("adafruit-feather-rp2350", "D12").mcu?.gpio).toBe(4);
    expect(pin("adafruit-feather-rp2350", "D13").flags).toEqual(["onboard-led"]);
    expect(tokens(pin("adafruit-feather-rp2350", "SDA"))).toContain("I2C1.SDA*");
  });

  it("does not flag GPIO7 and GPIO8 as flash on the ESP32 Feather V2", () => {
    expect(pin("adafruit-feather-esp32-v2", "RX").flags).toBeUndefined();
    expect(pin("adafruit-feather-esp32-v2", "RX").mcu?.gpio).toBe(7);
    expect(pin("adafruit-feather-esp32-v2", "I37").flags).toEqual(["input-only"]);
  });
});

describe("catalog corrections found by matching maps to variant files", () => {
  it("rebuilds the ItsyBitsy M4 from Adafruit's board file", () => {
    expect(pin("adafruit-itsybitsy-m4", "D13 / LED").mcu?.name).toBe("PA22");
    expect(pin("adafruit-itsybitsy-m4", "SCK").mcu?.name).toBe("PA01");
    expect(pin("adafruit-itsybitsy-m4", "RX / D0").mcu?.name).toBe("PA16");
    expect(pin("adafruit-itsybitsy-m4", "SDA").mcu?.name).toBe("PA12");
    expect(pin("adafruit-itsybitsy-m4", "D2").mcu?.name).toBe("PA07");
    const labels = pins(board("adafruit-itsybitsy-m4")).map((item) => item.label);
    expect(labels).not.toContain("D24");
    expect(labels).not.toContain("SCL / D3");
  });

  it("keeps SPI off D11 to D13 on the Arduino Zero, Metro M4, and RedBoard Turbo", () => {
    for (const [id, d13] of [
      ["arduino-zero", "D13 / LED"],
      ["adafruit-metro-m4-express", "D13 / LED"],
      ["sparkfun-redboard-turbo", "D13"],
    ]) {
      expect(pin(id, "D11").role, id).not.toBe("spi");
      expect(pin(id, d13).role, id).not.toBe("spi");
      expect(tokens(pin(id, d13)).some((token) => token.startsWith("SPI")), id).toBe(false);
    }
    expect(tokens(pin("arduino-zero", "CIPO"))).toContain("SPI.MISO");
  });

  it("gives the Metro M4 its own SDA and SCL pads", () => {
    expect(pin("adafruit-metro-m4-express", "SDA").mcu?.name).toBe("PB02");
    expect(pin("adafruit-metro-m4-express", "A4").role).toBe("adc");
  });

  it("names the Feather ESP32-S3 debug pad instead of a second D13", () => {
    expect(pins(board("adafruit-esp32-s3-feather")).filter((item) => item.label === "D13")).toHaveLength(1);
    expect(pin("adafruit-esp32-s3-feather", "DB").role).toBe("debug");
  });

  it("lists each Teensy 4.1 pin once, in physical order", () => {
    const teensy = board("teensy-41");
    expect(teensy.pinout?.layout).toBe("dual-row");
    const labels = pins(teensy).map((item) => item.label);
    expect(labels).toHaveLength(48);
    expect(labels.filter((label) => label === "14 / A0")).toHaveLength(1);
    expect(labels.slice(0, 3)).toEqual(["GND", "0", "1"]);
    expect(teensy.pinout?.pins?.right.slice(0, 4).map((item) => item.label)).toEqual([
      "VIN",
      "GND",
      "3V3",
      "23 / A9",
    ]);
  });
});

describe("planner", () => {
  it("covers every family the expansion added", () => {
    for (const id of [
      "raspberry-pi-4-model-b",
      "arduino-mega-2560-rev3",
      "esp32-s3-devkitc-1",
      "esp32-c3-devkitm-1",
      "stm32-nucleo-f446re",
      "teensy-41",
      "arduino-uno-r4-wifi",
      "nordic-nrf52840-dk",
      "lolin-d1-mini",
    ]) {
      const plan = planPins(board(id), { I2C: 1, UART: 1 });
      expect(plan.status, id).toBe("ok");
    }
  });

  it("finds a plan for one of each peripheral on nearly every board", () => {
    // These three really cannot: CAN shares the I2C pins on the Arduino headers.
    const canClash = new Set(["stm32-nucleo-f103rb", "stm32-nucleo-f072rb", "stm32-nucleo-f334r8"]);
    for (const item of boards.filter((entry) => entry.pinFunctions && entry.pinout)) {
      const wanted = Object.fromEntries(
        planCapabilities(item)
          .filter((entry) => entry.peripheral !== "GPIO")
          .map((entry) => [entry.peripheral, 1]),
      );
      const plan = planPins(item, wanted);
      expect(plan.status, item.id).toBe(canClash.has(item.id) ? "unsatisfiable" : "ok");
    }
  });

  it("plans SPI on a board with no chip select on the header", () => {
    // The Leonardo keeps SPI on ICSP, whose header has no SS pin.
    const leonardo = planPins(board("arduino-leonardo"), { SPI: 1 });
    expect(leonardo.status).toBe("ok");
    expect(leonardo.status === "ok" && leonardo.assignments.map((row) => row.pin.label)).toEqual(
      expect.arrayContaining(["SCK", "COPI", "CIPO"]),
    );
    // The Micro breaks SPI out, and any free pin serves as chip select.
    const plan = planPins(board("arduino-micro"), { SPI: 1, I2C: 1 });
    expect(plan.status).toBe("ok");
  });

  it("picks a software chip select that stays clear of the other units", () => {
    const plan = planPins(board("stm32-nucleo-f401re"), { SPI: 1, I2C: 1, UART: 1 });
    if (plan.status !== "ok") throw new Error(plan.status);
    const used = plan.assignments.map((item) => item.pin);
    expect(new Set(used).size).toBe(used.length);
    expect(plan.assignments.filter((item) => item.peripheral === "SPI")).toHaveLength(4);
  });
});

describe("board link", () => {
  it("reads controllers named by a letter or mux tag", () => {
    const signals = (label: string, ...aliases: string[]) =>
      busSignalsForPin({ position: 1, label, role: "gpio", aliases }).map(
        (item) => `${item.instance}.${item.signal}`,
      );
    expect(signals("GPIOX_12", "UART A TX")).toEqual(["UART_A.TX"]);
    expect(signals("GPIOX_17", "I2C_M2 SDA")).toEqual(["I2C_M2.SDA"]);
    expect(signals("GPIOAO_3", "I2C_AO_M0_SDA")).toEqual(["I2C_AOM0.SDA"]);
    expect(signals("PB05", "mikroBUS SDA")).toEqual([".SDA"]);
    // The tag never swallows a number, or a signal word.
    expect(signals("X", "UART2 TX")).toEqual(["UART2.TX"]);
    expect(signals("X", "I2C SDA")).toEqual([".SDA"]);
  });

  it("unblocks boards whose buses were only implied", () => {
    for (const id of [
      "esp32-s3-devkitc-1",
      "esp32-c3-devkitm-1",
      "esp32-c6-devkitc-1",
      "nodemcu-devkit-v1",
      "teensy-lc",
      "milkv-duo",
      "flipper-zero",
      "banana-pi-bpi-m5",
    ]) {
      expect(i2cCount(id), id).toBeGreaterThan(0);
    }
    for (const id of ["banana-pi-bpi-m5", "libre-computer-le-potato", "milkv-duo", "silabs-xg24-explorer-kit"]) {
      expect(uartCount(id), id).toBeGreaterThan(0);
    }
  });

  it("keeps Grand Central's Serial ports, named by the variant", () => {
    expect(linkPorts(board("adafruit-grand-central-m4-express"), "uart").map((port) => port.id)).toEqual(
      expect.arrayContaining(["Serial1", "Serial2", "Serial3", "Serial4"]),
    );
  });

  it("carries a strapping caution when an ESP32-C3 default uses the boot pins", () => {
    const link = buildBoardLink(board("esp32-c3-devkitm-1"), board("raspberry-pi-pico"), "i2c");
    expect(link.status).toBe("ready");
    expect(link.wires[0].a.cautions.map((item) => item.label).join(" ")).toMatch(/strapping/);
  });
});

describe("second-source audit of the expansion", () => {
  it.each(["arduino-nano-33-ble", "arduino-nano-33-ble-sense", "arduino-nano-33-ble-sense-rev2"])(
    "puts %s TX on P1.03 and RX on P1.10, as the core and Zephyr pinctrl do",
    (id) => {
      const tx = pin(id, "D1 / TX");
      const rx = pin(id, "D0 / RX");
      expect(tx.mcu?.name).toBe("P1_03");
      expect(tx.aliases).toContain("P1.03");
      expect(tokens(tx)).toContain("UART0.TX*");
      expect(rx.mcu?.name).toBe("P1_10");
      expect(rx.aliases).toContain("P1.10");
      expect(tokens(rx)).toContain("UART0.RX*");
    },
  );

  it.each([
    ["arduino-nano", ["A6", "A7"]],
    ["arduino-pro-mini", ["A6", "A7"]],
    ["lolin-d1-mini", ["A0"]],
    ["nodemcu-devkit-v1", ["A0"]],
  ])("never plans an output on the analog-only pins of %s", (id, labels) => {
    const item = board(id);
    const analogOnly = pins(item).filter((row) => labels.includes(row.label));
    expect(analogOnly).toHaveLength(labels.length);
    for (const row of analogOnly) expect(row.flags).toContain("input-only");
    expect(item.pinFunctions?.flagNotes["input-only"]).toBeTruthy();

    const others = new Set(pins(item).filter((row) => !labels.includes(row.label)));
    expect(planPins(item, { GPIO: 1 }, undefined, others).status).toBe("unsatisfiable");
    const plan = planPins(item, { SPI: 1 });
    if (plan.status === "ok") {
      expect(plan.assignments.map((row) => row.pin.label)).not.toEqual(expect.arrayContaining(labels));
    }
  });

  it.each([
    ["arduino-zero", "A0 / D14 / DAC0"],
    ["arduino-mkr-1000-wifi", "A0 / DAC0"],
    ["arduino-mkr-wifi-1010", "A0 / DAC0"],
    ["arduino-mkr-wan-1310", "A0 / DAC0"],
    ["arduino-mkr-zero", "A0 / DAC0"],
    ["arduino-nano-33-iot", "A0 / D14"],
    ["adafruit-feather-m0-express", "A0"],
    ["adafruit-feather-m4-express", "A0"],
    ["adafruit-metro-m4-express", "A0"],
    ["adafruit-itsybitsy-m4", "A0"],
    ["adafruit-grand-central-m4-express", "A0"],
  ])("offers the SAMD DAC on %s", (id, label) => {
    expect(tokens(pin(id, label))).toContain("DAC.CH0");
    const plan = planPins(board(id), { DAC: 1 });
    expect(plan.status).toBe("ok");
  });

  it.each([
    "adafruit-feather-m4-express", "adafruit-metro-m4-express", "adafruit-itsybitsy-m4",
    "adafruit-grand-central-m4-express",
  ])("offers the second SAMD51 DAC on %s", (id) => {
    expect(tokens(pin(id, "A1"))).toContain("DAC.CH1");
    expect(planPins(board(id), { DAC: 2 }).status).toBe("ok");
  });

  it("reads Grand Central A8 to A15 from the core's PIN_A8, not past A7 into USB", () => {
    const id = "adafruit-grand-central-m4-express";
    expect(pin(id, "A8").mcu?.name).toBe("PB05");
    expect(pin(id, "A11").mcu?.name).toBe("PB08");
    expect(pin(id, "A15").mcu?.name).toBe("PA07");
    expect(tokens(pin(id, "A15"))).toContain("ADC.CH7");
    const names = pins(board(id)).map((row) => row.mcu?.name);
    for (const usb of ["PA24", "PA25", "PA27"]) expect(names).not.toContain(usb);
    expect(planPins(board(id), { ADC: 16 }).status).toBe("ok");
  });

  it("gives the Grand Central SPI on D50 to D53, which the core calls the same bus", () => {
    const plan = planPins(board("adafruit-grand-central-m4-express"), { SPI: 1 });
    expect(plan.status).toBe("ok");
    expect(plan.status === "ok" && plan.assignments.map((row) => row.pin.label)).toEqual(
      expect.arrayContaining(["D50", "D51", "D52", "D53"]),
    );
  });

  it("uses the chip's own CS pin when it is free, and any free pin after that", () => {
    const item = board("stm32-nucleo-g071rb");
    const plan = planPins(item, { SPI: 1 });
    expect(plan.status).toBe("ok");
    const cs = plan.status === "ok" ? plan.assignments.find((row) => row.signal === "CS") : undefined;
    expect(cs?.pin.label).toBe("D10 / CS");
    const taken = planPins(item, { SPI: 1 }, undefined, new Set([pin(item.id, "D10 / CS")]));
    expect(taken.status).toBe("ok");
    expect(taken.status === "ok" && taken.assignments.some((row) => row.signal === "CS")).toBe(true);
  });

  it("does not call G431KB D13 an SPI pin, because it is PB8", () => {
    const d13 = pin("stm32-nucleo-g431kb", "D13");
    expect(d13.mcu?.name).toBe("PB8");
    expect(d13.role).toBe("gpio");
    expect(pin("stm32-nucleo-l432kc", "D13").role).toBe("spi");
  });

  it("says the MKR 1000's radio is the ATSAMW25, not the 1010's NINA module", () => {
    const text = (board("arduino-mkr-1000-wifi").pinout?.notes ?? []).join(" ");
    expect(text).not.toMatch(/NINA/);
    expect(text).toMatch(/ATSAMW25/);
  });

  it("does not give the RedBoard Qwiic notes written for Arduino's own UNOs", () => {
    const text = (board("sparkfun-redboard-qwiic").pinout?.notes ?? []).join(" ");
    expect(text).not.toMatch(/UNO R4/);
  });

  it("labels Orange Pi 3B pin 24 by its GPIO number, and names the pin 26 disagreement", () => {
    const item = board("orange-pi-3b");
    const pin24 = pins(item).find((row) => row.position === 24);
    expect(pin24?.label).toBe("SPI3_CS0");
    expect(item.warnings[0]).toMatch(/^Unverified pin 26:.*GPIO3_D6.*GPIO4_A7/);
    expect(item.pinout?.notes).toContain(item.warnings[0]);
  });

  it("keeps the disclosure only where no second source exists", () => {
    expect(board("orange-pi-zero-2w").warnings[0]).toMatch(/^Unverified pinout:/);
    const secondSourced = [
      "stm32-nucleo-l432kc", "stm32-nucleo-g431kb", "stm32-nucleo-f303k8",
      "libre-computer-alta", "libre-computer-solitude", "libre-computer-tritium-h5",
      "orange-pi-5-plus",
    ];
    for (const id of secondSourced) {
      const item = board(id);
      const text = [...item.warnings, ...(item.pinout?.notes ?? [])].join(" ");
      expect(text, id).not.toMatch(/Unverified/);
      expect(item.sourceLinks.length, id).toBeGreaterThanOrEqual(3);
    }
  });

  it("warns that A4 and A5 can be tied to D4 and D5 on a Nucleo-32", () => {
    expect(board("stm32-nucleo-f303k8").warnings.join(" ")).toMatch(/PA5.*PB7.*PA6.*PB6/);
    expect(board("stm32-nucleo-l432kc").warnings.join(" ")).toMatch(/A4.*D4/);
    expect(board("stm32-nucleo-g431kb").warnings.join(" ")).toMatch(/A4.*PB7.*A5.*PA15.*D13.*PB3/);
  });

  it("links the Orange Pi 5 Plus over the UART pins Adafruit Blinka names", () => {
    const item = board("orange-pi-5-plus");
    expect(pin("orange-pi-5-plus", "GPIO1_A1").aliases).toContain("UART6_TX");
    expect(pin("orange-pi-5-plus", "GPIO1_A0").aliases).toContain("UART6_RX");
    expect(linkPorts(item, "uart").filter((port) => port.complete).length).toBeGreaterThan(0);
    expect(buildBoardLink(item, board("raspberry-pi-pico"), "uart").status).not.toBe("blocked");
  });
});
