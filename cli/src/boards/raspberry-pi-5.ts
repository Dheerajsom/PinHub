import type { Board, Pin, PinCategory } from "../model.js";

/**
 * 40-pin J8 header pin. Odd physical pins sit in column 1, even in column 2,
 * one pin pair per row — matching the physical header viewed from above.
 */
function j8(
  physical: number,
  label: string,
  category: PinCategory,
  extra: Partial<Pin> = {},
): Pin {
  return {
    physical,
    position: { row: Math.ceil(physical / 2), column: physical % 2 === 1 ? 1 : 2 },
    label,
    category,
    ...extra,
  };
}

const V33 = { voltage: "3.3 V" };

export const raspberryPi5: Board = {
  id: "raspberry-pi-5",
  name: "Raspberry Pi 5",
  manufacturer: "Raspberry Pi",
  aliases: ["rpi5", "pi5", "raspberry-pi-5", "rpi-5", "pi-5", "raspi5"],
  description:
    "Current mainstream Raspberry Pi SBC with the standard 40-pin GPIO header (Broadcom BCM2712).",
  revisionNote:
    "The J8 40-pin header layout shown here is shared by all modern 40-pin Raspberry Pi models.",
  warnings: [
    {
      severity: "danger",
      text: "GPIO uses 3.3 V logic. Do not apply 5 V to any GPIO pin.",
    },
    {
      severity: "warning",
      text: "Physical pins 27 and 28 (GPIO0/GPIO1, ID_SD/ID_SC) are reserved for the HAT ID EEPROM; avoid general-purpose use.",
    },
    {
      severity: "info",
      text: "Pin numbers are the physical J8 header numbers; GPIO numbers are BCM numbering.",
    },
  ],
  sources: [
    {
      title: "Raspberry Pi GPIO documentation",
      url: "https://www.raspberrypi.com/documentation/computers/raspberry-pi.html",
      official: true,
    },
    {
      title: "Raspberry Pi 5 product brief",
      url: "https://datasheets.raspberrypi.com/rpi5/raspberry-pi-5-product-brief.pdf",
      official: true,
    },
  ],
  headers: [
    {
      id: "j8",
      name: "40-pin GPIO header (J8)",
      description: "Viewed from above with pin 1 at the top-left of the header.",
      layout: { rows: 20, columns: 2 },
      pins: [
        j8(1, "3V3", "power", { voltage: "3.3 V" }),
        j8(2, "5V", "power", { voltage: "5 V" }),
        j8(3, "GPIO2", "communication", { gpio: "GPIO2", functions: ["SDA1"], ...V33 }),
        j8(4, "5V", "power", { voltage: "5 V" }),
        j8(5, "GPIO3", "communication", { gpio: "GPIO3", functions: ["SCL1"], ...V33 }),
        j8(6, "GND", "ground"),
        j8(7, "GPIO4", "gpio", { gpio: "GPIO4", functions: ["GPCLK0"], ...V33 }),
        j8(8, "GPIO14", "communication", { gpio: "GPIO14", functions: ["TXD0"], ...V33 }),
        j8(9, "GND", "ground"),
        j8(10, "GPIO15", "communication", { gpio: "GPIO15", functions: ["RXD0"], ...V33 }),
        j8(11, "GPIO17", "gpio", { gpio: "GPIO17", ...V33 }),
        j8(12, "GPIO18", "gpio", { gpio: "GPIO18", functions: ["PWM0", "PCM_CLK"], ...V33 }),
        j8(13, "GPIO27", "gpio", { gpio: "GPIO27", ...V33 }),
        j8(14, "GND", "ground"),
        j8(15, "GPIO22", "gpio", { gpio: "GPIO22", ...V33 }),
        j8(16, "GPIO23", "gpio", { gpio: "GPIO23", ...V33 }),
        j8(17, "3V3", "power", { voltage: "3.3 V" }),
        j8(18, "GPIO24", "gpio", { gpio: "GPIO24", ...V33 }),
        j8(19, "GPIO10", "communication", { gpio: "GPIO10", functions: ["SPI0 MOSI"], ...V33 }),
        j8(20, "GND", "ground"),
        j8(21, "GPIO9", "communication", { gpio: "GPIO9", functions: ["SPI0 MISO"], ...V33 }),
        j8(22, "GPIO25", "gpio", { gpio: "GPIO25", ...V33 }),
        j8(23, "GPIO11", "communication", { gpio: "GPIO11", functions: ["SPI0 SCLK"], ...V33 }),
        j8(24, "GPIO8", "communication", { gpio: "GPIO8", functions: ["SPI0 CE0"], ...V33 }),
        j8(25, "GND", "ground"),
        j8(26, "GPIO7", "communication", { gpio: "GPIO7", functions: ["SPI0 CE1"], ...V33 }),
        j8(27, "GPIO0", "reserved", {
          gpio: "GPIO0",
          functions: ["ID_SD"],
          ...V33,
          notes: ["Reserved for HAT ID EEPROM"],
        }),
        j8(28, "GPIO1", "reserved", {
          gpio: "GPIO1",
          functions: ["ID_SC"],
          ...V33,
          notes: ["Reserved for HAT ID EEPROM"],
        }),
        j8(29, "GPIO5", "gpio", { gpio: "GPIO5", ...V33 }),
        j8(30, "GND", "ground"),
        j8(31, "GPIO6", "gpio", { gpio: "GPIO6", ...V33 }),
        j8(32, "GPIO12", "gpio", { gpio: "GPIO12", functions: ["PWM0"], ...V33 }),
        j8(33, "GPIO13", "gpio", { gpio: "GPIO13", functions: ["PWM1"], ...V33 }),
        j8(34, "GND", "ground"),
        j8(35, "GPIO19", "gpio", { gpio: "GPIO19", functions: ["PCM_FS"], ...V33 }),
        j8(36, "GPIO16", "gpio", { gpio: "GPIO16", ...V33 }),
        j8(37, "GPIO26", "gpio", { gpio: "GPIO26", ...V33 }),
        j8(38, "GPIO20", "gpio", { gpio: "GPIO20", functions: ["PCM_DIN"], ...V33 }),
        j8(39, "GND", "ground"),
        j8(40, "GPIO21", "gpio", { gpio: "GPIO21", functions: ["PCM_DOUT"], ...V33 }),
      ],
    },
  ],
};
