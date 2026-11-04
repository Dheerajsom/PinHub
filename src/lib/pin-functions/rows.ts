import type { PinFlag, PinFunction, PinPeripheral } from "../boards";
import type { PinFunctionTable } from "../pin-function-data";

// A compact row format for boards whose table is transcribed pin by pin:
//
//   "PD0@0 | U:Serial.RX* | usb"
//
// The chip's pin name, then #gpio and/or @arduino where the toolchain has them;
// the functions; the flags. Each function is a peripheral letter, the instance,
// the signal, and a trailing * when the source names it the default.

const peripherals: Record<string, PinPeripheral> = {
  I: "I2C",
  S: "SPI",
  U: "UART",
  C: "CAN",
  P: "PWM",
  A: "ADC",
  D: "DAC",
};

function parseFunction(token: string): PinFunction {
  const match = /^([ISUCPAD]):([A-Za-z][A-Za-z0-9_]*)\.([A-Z0-9]+)(\*?)$/.exec(token);
  if (!match) throw new Error(`Malformed pin function "${token}".`);
  const [, letter, instance, signal, star] = match;
  const peripheral = peripherals[letter];
  return star
    ? { peripheral, instance, signal, default: true }
    : { peripheral, instance, signal };
}

function parseRow(row: string): PinFunctionTable[string] {
  const [identity, functions = "", flags = ""] = row.split("|").map((part) => part.trim());
  const match = /^([A-Za-z][A-Za-z0-9_]*)(?:#(\d+))?(?:@([A-Za-z0-9_]+))?$/.exec(identity);
  if (!match) throw new Error(`Malformed pin identity "${identity}".`);
  const [, name, gpio, arduino] = match;
  return {
    mcu: {
      name,
      ...(gpio === undefined ? {} : { gpio: Number(gpio) }),
      ...(arduino === undefined ? {} : { arduino }),
    },
    ...(functions ? { functions: functions.split(/\s+/).map(parseFunction) } : {}),
    ...(flags ? { flags: flags.split(/\s+/) as PinFlag[] } : {}),
  };
}

/** A pin function table from compact rows, keyed by catalog pin label. */
export function tableFromRows(rows: Record<string, string>): PinFunctionTable {
  return Object.fromEntries(Object.entries(rows).map(([label, row]) => [label, parseRow(row)]));
}
