import type { Board, Pin, PinCategory } from "../model.js";

function col(
  physical: number,
  label: string,
  category: PinCategory,
  extra: Partial<Pin> = {},
): Pin {
  return {
    physical,
    position: { row: physical, column: 1 },
    label,
    category,
    ...extra,
  };
}

const V5 = { voltage: "5 V" };

export const arduinoUnoR3: Board = {
  id: "arduino-uno-rev3",
  name: "Arduino UNO R3",
  manufacturer: "Arduino",
  aliases: ["uno", "uno-r3", "arduino-uno", "arduino-uno-r3", "arduino-uno-rev3"],
  description:
    "Classic ATmega328P Arduino board with the reference UNO shield headers and 2×3 ICSP header. Digital IO is 5 V logic.",
  revisionNote:
    "This is the ATmega328P UNO R3. The newer UNO R4 boards keep the shield shape but use a different microcontroller — check `docs.arduino.cc` for R4 pin functions.",
  warnings: [
    {
      severity: "danger",
      text: "Digital IO is 5 V logic. Level-shift 3.3 V-only sensors and modules.",
    },
    {
      severity: "warning",
      text: "The 3.3 V regulator output is current-limited (~50 mA); do not power large peripherals from it.",
    },
    {
      severity: "info",
      text: "A4/A5 double as I2C SDA/SCL and are internally connected to the dedicated SDA/SCL pins next to AREF.",
    },
    {
      severity: "info",
      text: "SPI is available on D10–D13 and on the ICSP header.",
    },
  ],
  sources: [
    {
      title: "Arduino UNO Rev3 documentation",
      url: "https://docs.arduino.cc/hardware/uno-rev3/",
      official: true,
      type: "Docs",
    },
    {
      title: "Arduino UNO Rev3 full pinout PDF",
      url: "https://content.arduino.cc/assets/A000066-full-pinout.pdf",
      official: true,
      type: "Pinout",
    },
    {
      title: "Arduino UNO Rev3 datasheet",
      url: "https://docs.arduino.cc/resources/datasheets/A000066-datasheet.pdf",
      official: true,
      type: "Datasheet",
    },
  ],
  headers: [
    {
      id: "digital-high",
      name: "Digital header (SCL…D8)",
      description: "Top edge, left to right with the USB port on the left.",
      layout: { rows: 10, columns: 1 },
      pins: [
        col(1, "SCL", "communication", { functions: ["I2C SCL"], ...V5, notes: ["Connected to A5"] }),
        col(2, "SDA", "communication", { functions: ["I2C SDA"], ...V5, notes: ["Connected to A4"] }),
        col(3, "AREF", "analog", { notes: ["Analog reference voltage input"] }),
        col(4, "GND", "ground"),
        col(5, "D13", "communication", { gpio: "PB5", functions: ["SPI SCK", "LED_BUILTIN"], ...V5 }),
        col(6, "D12", "communication", { gpio: "PB4", functions: ["SPI MISO"], ...V5 }),
        col(7, "D11", "communication", { gpio: "PB3", functions: ["SPI MOSI", "PWM"], ...V5 }),
        col(8, "D10", "communication", { gpio: "PB2", functions: ["SPI SS", "PWM"], ...V5 }),
        col(9, "D9", "gpio", { gpio: "PB1", functions: ["PWM"], ...V5 }),
        col(10, "D8", "gpio", { gpio: "PB0", ...V5 }),
      ],
    },
    {
      id: "digital-low",
      name: "Digital header (D7…D0)",
      description: "Top edge, continues right of the D8 header.",
      layout: { rows: 8, columns: 1 },
      pins: [
        col(1, "D7", "gpio", { gpio: "PD7", ...V5 }),
        col(2, "D6", "gpio", { gpio: "PD6", functions: ["PWM"], ...V5 }),
        col(3, "D5", "gpio", { gpio: "PD5", functions: ["PWM"], ...V5 }),
        col(4, "D4", "gpio", { gpio: "PD4", ...V5 }),
        col(5, "D3", "gpio", { gpio: "PD3", functions: ["PWM", "INT1"], ...V5 }),
        col(6, "D2", "gpio", { gpio: "PD2", functions: ["INT0"], ...V5 }),
        col(7, "D1", "communication", { gpio: "PD1", functions: ["UART TX"], ...V5, notes: ["Shared with USB serial"] }),
        col(8, "D0", "communication", { gpio: "PD0", functions: ["UART RX"], ...V5, notes: ["Shared with USB serial"] }),
      ],
    },
    {
      id: "power",
      name: "Power header",
      description: "Bottom edge, left to right with the barrel jack on the left.",
      layout: { rows: 8, columns: 1 },
      pins: [
        col(1, "NC", "nc", { notes: ["Reserved, leave unconnected"] }),
        col(2, "IOREF", "power", { ...V5, notes: ["IO reference voltage for shields"] }),
        col(3, "RESET", "reserved", { notes: ["Active-low reset"] }),
        col(4, "3V3", "power", { voltage: "3.3 V", notes: ["~50 mA regulator output"] }),
        col(5, "5V", "power", { voltage: "5 V" }),
        col(6, "GND", "ground"),
        col(7, "GND", "ground"),
        col(8, "VIN", "power", { voltage: "7–12 V recommended", notes: ["Unregulated input"] }),
      ],
    },
    {
      id: "analog",
      name: "Analog input header",
      description: "Bottom edge, right of the power header.",
      layout: { rows: 6, columns: 1 },
      pins: [
        col(1, "A0", "analog", { gpio: "PC0", ...V5 }),
        col(2, "A1", "analog", { gpio: "PC1", ...V5 }),
        col(3, "A2", "analog", { gpio: "PC2", ...V5 }),
        col(4, "A3", "analog", { gpio: "PC3", ...V5 }),
        col(5, "A4", "analog", { gpio: "PC4", functions: ["I2C SDA"], ...V5 }),
        col(6, "A5", "analog", { gpio: "PC5", functions: ["I2C SCL"], ...V5 }),
      ],
    },
    {
      id: "icsp",
      name: "ICSP header (2×3)",
      description: "Pin 1 (MISO) is marked with a dot on the silkscreen.",
      layout: { rows: 3, columns: 2 },
      pins: [
        { physical: 1, position: { row: 1, column: 1 }, label: "MISO", category: "communication", functions: ["SPI MISO"], ...V5 },
        { physical: 2, position: { row: 1, column: 2 }, label: "5V", category: "power", voltage: "5 V" },
        { physical: 3, position: { row: 2, column: 1 }, label: "SCK", category: "communication", functions: ["SPI SCK"], ...V5 },
        { physical: 4, position: { row: 2, column: 2 }, label: "MOSI", category: "communication", functions: ["SPI MOSI"], ...V5 },
        { physical: 5, position: { row: 3, column: 1 }, label: "RESET", category: "reserved", notes: ["Active-low reset"] },
        { physical: 6, position: { row: 3, column: 2 }, label: "GND", category: "ground" },
      ],
    },
  ],
};
