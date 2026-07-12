import type { Board } from "../model.js";
import { picoDebugHeader, picoEdgeHeader } from "./pico-shared.js";

export const raspberryPiPico: Board = {
  id: "raspberry-pi-pico",
  name: "Raspberry Pi Pico",
  manufacturer: "Raspberry Pi",
  aliases: ["pico", "rpi-pico", "raspberry-pi-pico", "rp2040-pico"],
  description:
    "RP2040 microcontroller board with a 40-pin castellated DIP edge, three ADC inputs, and an SWD debug header.",
  revisionNote:
    "Pin map matches the official Pico R3 pinout. The Pico W shares this edge pinout but differs internally (see `ph pico-w`).",
  warnings: [
    {
      severity: "danger",
      text: "GPIO uses 3.3 V logic and is not 5 V tolerant.",
    },
    {
      severity: "warning",
      text: "ADC inputs (GP26–GP28) must stay within the ADC reference voltage range.",
    },
    {
      severity: "info",
      text: "RP2040 GPIO23–GPIO25 are used internally (SMPS control, VBUS sense, onboard LED) and are not on the edge header.",
    },
  ],
  sources: [
    {
      title: "Raspberry Pi Pico pinout PDF",
      url: "https://pip-assets.raspberrypi.com/categories/610-raspberry-pi-pico/documents/RP-008309-DS-1-Pico-R3-A4-Pinout.pdf",
      official: true,
    },
    {
      title: "Raspberry Pi Pico documentation",
      url: "https://www.raspberrypi.com/documentation/microcontrollers/raspberry-pi-pico.html",
      official: true,
    },
  ],
  headers: [picoEdgeHeader(), picoDebugHeader("SWD debug header (board end)")],
};
