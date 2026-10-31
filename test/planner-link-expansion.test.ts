import { describe, expect, it } from "vitest";
import { boards, type Board, type Pin } from "@/lib/boards";
import { boardVisuals } from "@/lib/board-visuals";
import { buildBoardLink, busSignalsForPin, linkPorts } from "@/lib/board-link";
import { planCapabilities, planPins } from "@/lib/pin-planner";
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
    // The Leonardo keeps SPI on ICSP, whose header has no SS pin. Its SPI has no
    // complete pin set here, so SPI stays out rather than a guessed chip select.
    expect(planCapabilities(board("arduino-leonardo")).map((item) => item.peripheral)).not.toContain("SPI");
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
