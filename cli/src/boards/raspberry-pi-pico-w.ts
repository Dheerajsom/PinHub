import type { Board } from "../model.js";
import { picoDebugHeader, picoEdgeHeader } from "./pico-shared.js";

export const raspberryPiPicoW: Board = {
  id: "raspberry-pi-pico-w",
  name: "Raspberry Pi Pico W",
  manufacturer: "Raspberry Pi",
  aliases: ["pico-w", "picow", "rpi-pico-w", "raspberry-pi-pico-w"],
  description:
    "Wireless (Wi-Fi/Bluetooth) version of the Pico. Same 40-pin edge pinout as the Pico; the SWD debug pads move to the middle of the board.",
  revisionNote:
    "Edge pinout matches the original Pico, but the onboard LED is driven by the wireless chip (WL_GPIO0), not RP2040 GPIO25.",
  warnings: [
    {
      severity: "danger",
      text: "GPIO uses 3.3 V logic and is not 5 V tolerant.",
    },
    {
      severity: "warning",
      text: "Some RP2040 GPIO are used internally for the wireless interface; the onboard LED is not on GPIO25 as on the original Pico.",
    },
    {
      severity: "warning",
      text: "ADC inputs (GP26–GP28) must stay within the ADC reference voltage range.",
    },
  ],
  sources: [
    {
      title: "Raspberry Pi Pico W pinout PDF",
      url: "https://pip-assets.raspberrypi.com/categories/686-raspberry-pi-pico-w/documents/RP-008315-DS-1-PicoW-A4-Pinout.pdf",
      official: true,
    },
    {
      title: "Raspberry Pi Pico documentation",
      url: "https://www.raspberrypi.com/documentation/microcontrollers/raspberry-pi-pico.html",
      official: true,
    },
  ],
  headers: [picoEdgeHeader(), picoDebugHeader("SWD debug pads (mid-board)")],
};
