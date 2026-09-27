import type {
  PinFlag,
  PinFunction,
  PinFunctionData,
  PinMcu,
  PinPeripheral,
  PinPlanExportFormat,
} from "@/lib/boards";
import { isSafeExternalUrl } from "@/lib/source-trust";

// Runtime shape checks for the pin planner fields on a board record. The
// catalog fetches full records from /api/boards/[id], so these optional fields
// are validated and size-bounded at that boundary like the rest of the record.

export const pinPeripherals: readonly PinPeripheral[] = [
  "I2C",
  "SPI",
  "UART",
  "CAN",
  "PWM",
  "ADC",
  "DAC",
];
export const pinFlags: readonly PinFlag[] = [
  "strapping",
  "boot",
  "onboard-led",
  "usb",
  "input-only",
  "adc-unavailable-with-wifi",
  "module-memory",
  "jtag",
];
export const pinPlanExportFormats: readonly PinPlanExportFormat[] = [
  "c-header",
  "micropython",
  "arduino",
  "json",
];

const maxFunctionsPerPin = 16;
const maxSources = 16;
const maxRoutable = 8;
const maxRoutableEntries = 16;
const maxNoteLength = 600;
const maxNameLength = 24;
const identifierPattern = /^[A-Za-z][A-Za-z0-9_]*$/;
const signalPattern = /^[A-Z0-9]+$/;

const peripheralSet = new Set<string>(pinPeripherals);
const flagSet = new Set<string>(pinFlags);
const exportSet = new Set<string>(pinPlanExportFormats);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isShortText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function isIdentifier(value: unknown): value is string {
  return isShortText(value, maxNameLength) && identifierPattern.test(value);
}

function isSignal(value: unknown): value is string {
  return isShortText(value, maxNameLength) && signalPattern.test(value);
}

function isGpioNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 255;
}

function isUniqueList<T>(
  value: unknown,
  max: number,
  check: (item: unknown) => item is T,
  { allowEmpty = false }: { allowEmpty?: boolean } = {},
): value is T[] {
  return (
    Array.isArray(value) &&
    (allowEmpty || value.length > 0) &&
    value.length <= max &&
    value.every(check) &&
    new Set(value.map((item) => JSON.stringify(item))).size === value.length
  );
}

export function isPinMcu(value: unknown): value is PinMcu {
  return (
    isRecord(value) &&
    isIdentifier(value.name) &&
    (value.gpio === undefined || isGpioNumber(value.gpio)) &&
    (value.arduino === undefined ||
      (typeof value.arduino === "string" &&
        (isIdentifier(value.arduino) || /^\d{1,3}$/.test(value.arduino))))
  );
}

export function isPinFunction(value: unknown): value is PinFunction {
  return (
    isRecord(value) &&
    typeof value.peripheral === "string" &&
    peripheralSet.has(value.peripheral) &&
    isIdentifier(value.instance) &&
    isSignal(value.signal) &&
    (value.default === undefined || value.default === true)
  );
}

export function isPinFunctionList(value: unknown): value is PinFunction[] {
  return isUniqueList(value, maxFunctionsPerPin, isPinFunction);
}

function isPinFlag(value: unknown): value is PinFlag {
  return typeof value === "string" && flagSet.has(value);
}

export function isPinFlagList(value: unknown): value is PinFlag[] {
  return isUniqueList(value, pinFlags.length, isPinFlag);
}

function isSource(value: unknown): boolean {
  return (
    isRecord(value) &&
    isShortText(value.label, 200) &&
    typeof value.url === "string" &&
    value.url.length <= 400 &&
    isSafeExternalUrl(value.url) &&
    typeof value.type === "string" &&
    ["Docs", "Pinout", "Datasheet", "Schematic", "Manual"].includes(value.type)
  );
}

function isRoutable(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.peripheral === "string" &&
    peripheralSet.has(value.peripheral) &&
    isUniqueList(value.instances, maxRoutableEntries, isIdentifier) &&
    isUniqueList(value.signals, maxRoutableEntries, isSignal)
  );
}

export function isPinFunctionData(value: unknown): value is PinFunctionData {
  if (!isRecord(value)) return false;
  const { sources, mux, flagNotes, exports, micropythonBusIds } = value;
  if (
    !Array.isArray(sources) ||
    sources.length === 0 ||
    sources.length > maxSources ||
    !sources.every(isSource) ||
    new Set(sources.map((source) => (source as { url: string }).url)).size !== sources.length
  ) {
    return false;
  }
  if (
    !isRecord(mux) ||
    (mux.model !== "fixed" && mux.model !== "matrix") ||
    !isShortText(mux.note, maxNoteLength) ||
    (mux.routable !== undefined &&
      (mux.model !== "matrix" ||
        !Array.isArray(mux.routable) ||
        mux.routable.length > maxRoutable ||
        !mux.routable.every(isRoutable)))
  ) {
    return false;
  }
  if (
    !isRecord(flagNotes) ||
    !Object.entries(flagNotes).every(
      ([flag, note]) => flagSet.has(flag) && isShortText(note, maxNoteLength),
    )
  ) {
    return false;
  }
  if (
    !isUniqueList(
      exports,
      pinPlanExportFormats.length,
      (item): item is PinPlanExportFormat => typeof item === "string" && exportSet.has(item),
    )
  ) {
    return false;
  }
  return (
    micropythonBusIds === undefined ||
    (isRecord(micropythonBusIds) &&
      Object.keys(micropythonBusIds).length <= maxRoutableEntries &&
      Object.entries(micropythonBusIds).every(
        ([instance, id]) =>
          isIdentifier(instance) &&
          typeof id === "number" &&
          Number.isSafeInteger(id) &&
          id >= 0 &&
          id <= 15,
      ))
  );
}
