import { isRecordedGpioName } from "@/lib/pin-match";
import type { Pin, PinFunction, PinFunctionData } from "@/lib/boards";

export type PinFlagNotes = PinFunctionData["flagNotes"];

/** Preserve recorded restrictions without inventing electrical limits. */
export function pinCautionTexts(pin: Pin, notes: PinFlagNotes = {}): string[] {
  return [...new Set([
    ...(pin.note ? [pin.note] : []),
    ...(pin.flags ?? []).map((flag) => notes[flag] ?? `Recorded flag: ${flag.replaceAll("-", " ")}. Verify the linked documentation.`),
  ])];
}

/** Digital GPIO identity, with explicit analog-only restrictions taking precedence. */
export function isReferenceGpio(pin: Pin): boolean {
  if (["power", "ground", "reserved"].includes(pin.role)) return false;
  if (/\banalog(?:ue)?(?:[- ]input)?[- ]only\b|\bnot (?:a )?(?:general[- ]purpose )?(?:digital )?(?:gpio|i\/?o)\b/i.test(pin.note ?? "")) return false;
  if (pin.role === "gpio" || typeof pin.mcu?.gpio === "number") return true;
  // An MCU name such as ADC6 or A0 alone is not evidence of digital I/O.
  if (pin.mcu && isRecordedGpioName(pin.mcu.name)) return true;
  if (pin.mcu && /^(?:PIN\d+|GPIO(?:\d+|_[A-Z0-9_]+)|GP\d+|P[A-Z]\d+|P\d+[._]\d+|P\d{2,3})\b/i.test(pin.mcu.name)) return true;
  return [pin.label, ...(pin.aliases ?? [])].some((name) =>
    isRecordedGpioName(name) || /^(?:GP|P[A-Z])\d+\b/i.test(name) || (pin.role !== "adc" && /^IO\d+\b/i.test(name)));
}

/** Same recorded matrix eligibility as the planner, including input-only limits. */
export function referenceFunctions(pin: Pin, data?: PinFunctionData): PinFunction[] {
  const functions = [...(pin.functions ?? [])];
  if (!pin.mcu || ["power", "ground", "reserved"].includes(pin.role) ||
      (pin.role === "system" && !pin.flags?.length) || data?.mux.model !== "matrix") return functions;
  for (const route of data.mux.routable ?? []) {
    for (const signal of route.signals) {
      if (pin.flags?.includes("input-only") && route.peripheral !== "ADC" && !["RX", "MISO"].includes(signal)) continue;
      // One instance is enough to describe discoverability; the planner owns
      // instance allocation and conflict-free routing.
      if (!functions.some((item) => item.peripheral === route.peripheral && item.signal === signal)) {
        functions.push({ peripheral: route.peripheral, instance: route.instances[0], signal });
      }
    }
  }
  return functions;
}
