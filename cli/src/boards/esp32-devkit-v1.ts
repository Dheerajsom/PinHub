import type { Board, Pin, PinCategory } from "../model.js";

/**
 * DOIT ESP32 DevKit V1, 30-pin variant. Physical numbering is positional
 * (DOIT boards do not silkscreen pin numbers): 1–15 down the left side and
 * 16–30 down the right side, viewed from above with the USB port at the
 * bottom.
 */
function pin(
  physical: number,
  label: string,
  category: PinCategory,
  extra: Partial<Pin> = {},
): Pin {
  const left = physical <= 15;
  return {
    physical,
    position: { row: left ? physical : physical - 15, column: left ? 1 : 2 },
    label,
    category,
    ...extra,
  };
}

const V33 = { voltage: "3.3 V" };
const INPUT_ONLY = ["Input only — no output driver, no internal pull resistors"];

export const esp32DevkitV1: Board = {
  id: "esp32-devkit-v1",
  name: "ESP32 DevKit V1 (DOIT, 30-pin)",
  manufacturer: "DOIT (ESP32-WROOM-32 module by Espressif)",
  aliases: [
    "esp32",
    "esp32-devkit",
    "esp32-devkit-v1",
    "esp32-devkitv1",
    "doit-esp32-devkit-v1",
    "esp32-wroom-32",
    "esp32-devkitc",
  ],
  description:
    "The ubiquitous 30-pin ESP32-WROOM-32 breadboard dev kit. Wi-Fi + Bluetooth, two breadboard-friendly headers, 3.3 V logic.",
  revisionNote:
    "ESP32 dev boards vary a lot: 30-pin DevKit V1, 36-pin variants, and the 38-pin Espressif ESP32-DevKitC all have different headers. Verify the silkscreen of your exact board before wiring anything.",
  warnings: [
    {
      severity: "danger",
      text: "GPIO uses 3.3 V logic. Do not apply 5 V to any GPIO pin.",
    },
    {
      severity: "danger",
      text: "GPIO0, GPIO2, GPIO5, GPIO12 and GPIO15 are boot-strapping pins; external pull-ups/downs at reset can stop the board from booting or flashing.",
    },
    {
      severity: "warning",
      text: "GPIO34–GPIO39 (VP, VN, D34, D35) are input-only and have no internal pull resistors.",
    },
    {
      severity: "warning",
      text: "ADC2 channels cannot be used while Wi-Fi is active; prefer ADC1 (VP, VN, D32–D35) for analog reads.",
    },
    {
      severity: "info",
      text: "TX0/RX0 (GPIO1/GPIO3) carry the USB serial console and are used for flashing.",
    },
  ],
  sources: [
    {
      title: "Espressif ESP32-WROOM-32 datasheet",
      url: "https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32_datasheet_en.pdf",
      official: true,
    },
    {
      title: "Espressif ESP32 series datasheet",
      url: "https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf",
      official: true,
    },
    {
      title: "Last Minute Engineers — ESP32 DevKit pinout reference (third-party board layout)",
      url: "https://lastminuteengineers.com/esp32-pinout-reference/",
      official: false,
    },
  ],
  headers: [
    {
      id: "main",
      name: "30-pin breadboard headers",
      description:
        "Viewed from above, USB port at the bottom. Pins numbered 1–15 down the left and 16–30 down the right (positional; not silkscreened).",
      layout: { rows: 15, columns: 2 },
      pins: [
        pin(1, "EN", "reserved", { notes: ["Chip enable / reset (active low), wired to the EN button"], ...V33 }),
        pin(2, "VP", "analog", { gpio: "GPIO36", functions: ["ADC1_CH0"], notes: INPUT_ONLY, ...V33 }),
        pin(3, "VN", "analog", { gpio: "GPIO39", functions: ["ADC1_CH3"], notes: INPUT_ONLY, ...V33 }),
        pin(4, "D34", "analog", { gpio: "GPIO34", functions: ["ADC1_CH6"], notes: INPUT_ONLY, ...V33 }),
        pin(5, "D35", "analog", { gpio: "GPIO35", functions: ["ADC1_CH7"], notes: INPUT_ONLY, ...V33 }),
        pin(6, "D32", "analog", { gpio: "GPIO32", functions: ["ADC1_CH4", "Touch9"], ...V33 }),
        pin(7, "D33", "analog", { gpio: "GPIO33", functions: ["ADC1_CH5", "Touch8"], ...V33 }),
        pin(8, "D25", "analog", { gpio: "GPIO25", functions: ["DAC1", "ADC2_CH8"], ...V33 }),
        pin(9, "D26", "analog", { gpio: "GPIO26", functions: ["DAC2", "ADC2_CH9"], ...V33 }),
        pin(10, "D27", "gpio", { gpio: "GPIO27", functions: ["ADC2_CH7", "Touch7"], ...V33 }),
        pin(11, "D14", "gpio", { gpio: "GPIO14", functions: ["HSPI CLK", "ADC2_CH6"], ...V33 }),
        pin(12, "D12", "gpio", {
          gpio: "GPIO12",
          functions: ["HSPI MISO", "ADC2_CH5"],
          notes: ["Boot strap: must be low at reset"],
          ...V33,
        }),
        pin(13, "D13", "gpio", { gpio: "GPIO13", functions: ["HSPI MOSI", "ADC2_CH4"], ...V33 }),
        pin(14, "GND", "ground"),
        pin(15, "VIN", "power", { voltage: "5 V", notes: ["5 V input when not powered over USB"] }),
        pin(16, "D23", "communication", { gpio: "GPIO23", functions: ["VSPI MOSI"], ...V33 }),
        pin(17, "D22", "communication", { gpio: "GPIO22", functions: ["I2C SCL"], ...V33 }),
        pin(18, "TX0", "communication", {
          gpio: "GPIO1",
          functions: ["UART0 TX"],
          notes: ["USB serial console / flashing"],
          ...V33,
        }),
        pin(19, "RX0", "communication", {
          gpio: "GPIO3",
          functions: ["UART0 RX"],
          notes: ["USB serial console / flashing"],
          ...V33,
        }),
        pin(20, "D21", "communication", { gpio: "GPIO21", functions: ["I2C SDA"], ...V33 }),
        pin(21, "D19", "communication", { gpio: "GPIO19", functions: ["VSPI MISO"], ...V33 }),
        pin(22, "D18", "communication", { gpio: "GPIO18", functions: ["VSPI CLK"], ...V33 }),
        pin(23, "D5", "communication", {
          gpio: "GPIO5",
          functions: ["VSPI CS"],
          notes: ["Boot strap: outputs PWM at boot; keep high at reset"],
          ...V33,
        }),
        pin(24, "TX2", "communication", { gpio: "GPIO17", functions: ["UART2 TX"], ...V33 }),
        pin(25, "RX2", "communication", { gpio: "GPIO16", functions: ["UART2 RX"], ...V33 }),
        pin(26, "D4", "gpio", { gpio: "GPIO4", functions: ["ADC2_CH0", "Touch0"], ...V33 }),
        pin(27, "D2", "gpio", {
          gpio: "GPIO2",
          functions: ["ADC2_CH2", "Touch2"],
          notes: ["Onboard LED; boot strap: must be floating or low at reset"],
          ...V33,
        }),
        pin(28, "D15", "gpio", {
          gpio: "GPIO15",
          functions: ["ADC2_CH3", "HSPI CS"],
          notes: ["Boot strap: keep high at reset to silence boot log"],
          ...V33,
        }),
        pin(29, "GND", "ground"),
        pin(30, "3V3", "power", { voltage: "3.3 V", notes: ["Regulator output"] }),
      ],
    },
  ],
};
