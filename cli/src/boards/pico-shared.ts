import type { Header, Pin, PinCategory } from "../model.js";

/**
 * Raspberry Pi Pico / Pico W 40-pin castellated DIP edge. Physical pins run
 * 1–20 down the left side and 21–40 back up the right side (USB at the top),
 * so row r pairs physical pin r with physical pin 41−r.
 */
function edge(
  physical: number,
  label: string,
  category: PinCategory,
  extra: Partial<Pin> = {},
): Pin {
  const left = physical <= 20;
  return {
    physical,
    position: {
      row: left ? physical : 41 - physical,
      column: left ? 1 : 2,
    },
    label,
    category,
    ...extra,
  };
}

const V33 = { voltage: "3.3 V" };

export function picoEdgeHeader(): Header {
  return {
    id: "dip-edge",
    name: "40-pin castellated DIP edge",
    description:
      "Viewed from above with the USB connector at the top; pin 1 is top-left, pin 40 top-right.",
    layout: { rows: 20, columns: 2 },
    pins: [
      edge(1, "GP0", "communication", { gpio: "GP0", functions: ["UART0 TX"], ...V33 }),
      edge(2, "GP1", "communication", { gpio: "GP1", functions: ["UART0 RX"], ...V33 }),
      edge(3, "GND", "ground"),
      edge(4, "GP2", "gpio", { gpio: "GP2", ...V33 }),
      edge(5, "GP3", "gpio", { gpio: "GP3", ...V33 }),
      edge(6, "GP4", "communication", { gpio: "GP4", functions: ["I2C0 SDA"], ...V33 }),
      edge(7, "GP5", "communication", { gpio: "GP5", functions: ["I2C0 SCL"], ...V33 }),
      edge(8, "GND", "ground"),
      edge(9, "GP6", "gpio", { gpio: "GP6", ...V33 }),
      edge(10, "GP7", "gpio", { gpio: "GP7", ...V33 }),
      edge(11, "GP8", "communication", { gpio: "GP8", functions: ["SPI1 RX"], ...V33 }),
      edge(12, "GP9", "communication", { gpio: "GP9", functions: ["SPI1 CSn"], ...V33 }),
      edge(13, "GND", "ground"),
      edge(14, "GP10", "communication", { gpio: "GP10", functions: ["SPI1 SCK"], ...V33 }),
      edge(15, "GP11", "communication", { gpio: "GP11", functions: ["SPI1 TX"], ...V33 }),
      edge(16, "GP12", "gpio", { gpio: "GP12", ...V33 }),
      edge(17, "GP13", "gpio", { gpio: "GP13", ...V33 }),
      edge(18, "GND", "ground"),
      edge(19, "GP14", "gpio", { gpio: "GP14", ...V33 }),
      edge(20, "GP15", "gpio", { gpio: "GP15", ...V33 }),
      edge(21, "GP16", "communication", { gpio: "GP16", functions: ["SPI0 RX"], ...V33 }),
      edge(22, "GP17", "communication", { gpio: "GP17", functions: ["SPI0 CSn"], ...V33 }),
      edge(23, "GND", "ground"),
      edge(24, "GP18", "communication", { gpio: "GP18", functions: ["SPI0 SCK"], ...V33 }),
      edge(25, "GP19", "communication", { gpio: "GP19", functions: ["SPI0 TX"], ...V33 }),
      edge(26, "GP20", "communication", { gpio: "GP20", functions: ["I2C0 SDA"], ...V33 }),
      edge(27, "GP21", "communication", { gpio: "GP21", functions: ["I2C0 SCL"], ...V33 }),
      edge(28, "GND", "ground"),
      edge(29, "GP22", "gpio", { gpio: "GP22", ...V33 }),
      edge(30, "RUN", "reserved", {
        notes: ["Reset control: pull low to reset the board"],
        ...V33,
      }),
      edge(31, "GP26", "analog", { gpio: "GP26", functions: ["ADC0"], ...V33 }),
      edge(32, "GP27", "analog", { gpio: "GP27", functions: ["ADC1"], ...V33 }),
      edge(33, "AGND", "ground", { notes: ["Analog ground reference"] }),
      edge(34, "GP28", "analog", { gpio: "GP28", functions: ["ADC2"], ...V33 }),
      edge(35, "ADC_VREF", "analog", {
        notes: ["ADC reference voltage input/output"],
        ...V33,
      }),
      edge(36, "3V3", "power", { voltage: "3.3 V", functions: ["3V3(OUT)"] }),
      edge(37, "3V3_EN", "reserved", {
        notes: ["Pull low to disable the onboard 3.3 V regulator"],
      }),
      edge(38, "GND", "ground"),
      edge(39, "VSYS", "power", { voltage: "1.8–5.5 V", notes: ["Main system input voltage"] }),
      edge(40, "VBUS", "power", { voltage: "5 V", notes: ["USB bus voltage"] }),
    ],
  };
}

export function picoDebugHeader(swdName: string): Header {
  return {
    id: "swd",
    name: swdName,
    layout: { rows: 3, columns: 1 },
    pins: [
      {
        physical: 1,
        position: { row: 1, column: 1 },
        label: "SWCLK",
        category: "communication",
        functions: ["SWD clock"],
        voltage: "3.3 V",
      },
      {
        physical: 2,
        position: { row: 2, column: 1 },
        label: "GND",
        category: "ground",
      },
      {
        physical: 3,
        position: { row: 3, column: 1 },
        label: "SWDIO",
        category: "communication",
        functions: ["SWD data"],
        voltage: "3.3 V",
      },
    ],
  };
}
