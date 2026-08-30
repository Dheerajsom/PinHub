import { Chalk, type ChalkInstance } from "chalk";
import type { Pin, WarningSeverity } from "../model.js";

export function makeChalk(colorEnabled: boolean): ChalkInstance {
  // The palette uses only the portable 16-color range. Avoid emitting truecolor
  // sequences merely because stdout is a TTY; older consoles can still render
  // this level cleanly.
  return new Chalk({ level: colorEnabled ? 1 : 0 });
}

/**
 * Category colors. Color is never the only signal: labels and category names
 * stay in the output so meaning survives `--no-color` and piping.
 */
export function pinStyle(c: ChalkInstance, pin: Pin): (text: string) => string {
  switch (pin.category) {
    case "power":
      return pin.voltage?.startsWith("5") ? c.red : c.yellow;
    case "ground":
      return c.gray;
    case "gpio":
    case "digital":
      return c.green;
    case "analog":
      return c.blue;
    case "communication":
      return c.cyan;
    case "special":
      return c.white;
    case "reserved":
      return c.magenta;
    case "nc":
      return c.dim;
  }
}

export function warningStyle(
  c: ChalkInstance,
  severity: WarningSeverity,
): (text: string) => string {
  switch (severity) {
    case "danger":
      return c.red.bold;
    case "warning":
      return c.yellow;
    case "info":
      return c.dim;
  }
}
