import type { Board } from "../model.js";
import { raspberryPi5 } from "./raspberry-pi-5.js";
import { raspberryPiPico } from "./raspberry-pi-pico.js";
import { raspberryPiPicoW } from "./raspberry-pi-pico-w.js";
import { arduinoUnoR3 } from "./arduino-uno-r3.js";
import { esp32DevkitV1 } from "./esp32-devkit-v1.js";
import { generatedBoards } from "./generated.js";

/**
 * Flagship boards keep richer hand-written modules; the rest of the catalog
 * is generated from the PinHub website data (see cli/scripts/).
 */
export const boards: Board[] = [
  raspberryPi5,
  raspberryPiPico,
  raspberryPiPicoW,
  arduinoUnoR3,
  esp32DevkitV1,
  ...generatedBoards,
];
