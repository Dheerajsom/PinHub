import type { Board, Pin, PinPeripheral } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { referenceFunctions } from "@/lib/pin-reference";
import { raspberryPiModel } from "@/lib/raspberry-pi-models";
import type { PinRef, PinSpec, ScanResult, Unfollowed, Usage } from "./scan";

// Matches what `scan.ts` found against one board's record and states what the
// record says about each pin. Every finding quotes or names the record: a
// flag's source note, the pin's recorded role, or the absence of a recorded
// function. Nothing is inferred about a pin the record does not describe.

export type Severity = "fix" | "check" | "note";

export type Finding = {
  severity: Severity;
  title: string;
  /** Plain explanation, in PinHub's words. */
  detail: string;
  /** The source's own wording, when the finding comes from a flagged note. */
  quote?: string;
};

export type PinPlace = { key: string; group?: string; position: number };

export type CheckedPin = {
  /** Stable id: the chip's pin name where recorded, else the first anchor key. */
  id: string;
  pin: Pin;
  /** Every place on the connector map that carries this signal. */
  places: PinPlace[];
  usages: Usage[];
  refs: PinRef[];
  findings: Finding[];
  status: "fix" | "check" | "clear";
};

export type MissingRef = { ref: PinRef; reason: string };

export type CheckReport = {
  pins: CheckedPin[];
  missing: MissingRef[];
  unfollowed: Unfollowed[];
  /** Unfollowed values past the scanner's cap, not listed in `unfollowed` (0 when none). */
  unfollowedDropped: number;
  /** The scanner stopped at `maxRefs` references, so the rest of the code was not checked. */
  refsCapped: boolean;
  counts: { fix: number; check: number; clear: number };
  /** How bare numbers were matched on this board, for the report's footnote. */
  numbering: string | null;
};

type Located = { key: string; pin: Pin; group?: string };

function locate(board: Board): Located[] {
  const geometry = buildBoardGeometry(board, { sheet: true });
  if (geometry) return geometry.anchors.map(({ key, pin, group }) => ({ key, pin, group }));
  // Without a drawing the record is still checkable; keys follow the sheet's shape.
  const pinout = board.pinout;
  if (!pinout) return [];
  if (pinout.pins) {
    return [
      ...pinout.pins.left.map((pin, index) => ({ key: `pL:${index}`, pin })),
      ...pinout.pins.right.map((pin, index) => ({ key: `pR:${index}`, pin })),
    ];
  }
  return (pinout.groups ?? []).flatMap((group, g) =>
    group.pins.map((pin, index) => ({ key: `g${g}:${index}`, pin, group: group.label })),
  );
}

function normalizeName(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

/** Every name the record gives a pin: SDK name, Arduino name, label parts, aliases. */
function pinNames(pin: Pin): string[] {
  const names = [
    pin.mcu?.name,
    pin.mcu?.arduino,
    ...pin.label.split("/"),
    ...(pin.aliases ?? []),
  ];
  return names.filter((name): name is string => Boolean(name && name.trim())).map(normalizeName);
}

/**
 * How a bare number in the code names a pin on this board:
 * - "arduino": the record's Arduino pin numbers (its core variant), or the
 *   D-number on the label of a pin the record names only by port (PA5);
 * - "arduino-labels": no Arduino numbers recorded, so only a D-number (or, for
 *   `analogRead`, an A-number) printed on a pin's label;
 * - "gpio": GPIO numbers, as the SDK (or a GPIO-numbered Arduino core) uses them.
 */
type Numbering = "arduino" | "arduino-labels" | "gpio";

/** Chips whose Arduino cores number pins by GPIO: the ESP32 family and RP2040/RP2350. */
const gpioNumberedChip = /\bESP32|\bESP8684\b|\bRP2040\b|\bRP2350/i;

function gpioNumberedArduino(board: Board): boolean {
  // "Renesas RA4M1 + ESP32-S3 radio": the radio's chip does not run the sketch.
  return gpioNumberedChip.test(board.processor.split("+")[0]);
}

function numberingFor(board: Board, dialect: ScanResult["dialect"], located: Located[]): Numbering {
  if (dialect !== "arduino") return "gpio";
  if (located.some(({ pin }) => pin.mcu?.arduino !== undefined)) return "arduino";
  return gpioNumberedArduino(board) ? "gpio" : "arduino-labels";
}

function labelParts(pin: Pin): string[] {
  return [...pin.label.split("/"), ...(pin.aliases ?? [])].map(normalizeName).filter(Boolean);
}

/** The record gives this pin a numeric Arduino number, which outranks its label. */
function numericArduino(pin: Pin): boolean {
  return /^\d+$/.test(pin.mcu?.arduino ?? "");
}

/** Pins whose label carries `D<n>` (or `A<n>`) and whose record has no numeric Arduino number. */
function labelled(located: Located[], name: string): Located[] {
  return located.filter(({ pin }) => !numericArduino(pin) && labelParts(pin).includes(name));
}

/** A label D-number that differs from the pin's GPIO number (Nano ESP32, XIAO): a second numbering exists. */
function labelsDisagreeWithGpio(located: Located[]): boolean {
  return located.some(({ pin }) =>
    pin.role !== "reserved" && pin.mcu?.gpio !== undefined && labelParts(pin).some((part) => /^D\d+$/.test(part) && Number(part.slice(1)) !== pin.mcu?.gpio),
  );
}

function numberingNote(numbering: Numbering, dialect: ScanResult["dialect"], located: Located[]): string {
  switch (numbering) {
    case "arduino":
      return located.some(({ pin }) => pin.mcu?.arduino && /^P[A-Z]\d/.test(pin.mcu.arduino))
        ? "Bare numbers are matched to the D-numbers on this board's labels (D13 for 13); its record names Arduino pins by port (PA5)."
        : "Bare numbers are matched to this board's Arduino pin numbers, as its core variant names them.";
    case "arduino-labels":
      return located.some(({ pin }) => labelParts(pin).some((part) => /^D\d+$/.test(part)))
        ? "This board's record names no Arduino pin numbers, so a bare number is matched only to a pin whose label carries it (D2 for 2). Other numbers are left unchecked."
        : "This board's record names no Arduino pin numbers, so bare numbers are left unchecked. Name pins the way the record does.";
    case "gpio":
      if (dialect !== "arduino") return "Bare numbers are matched to GPIO numbers, as the SDK names them.";
      return `This board's record names no Arduino pin numbers, so bare numbers are matched to GPIO numbers, as Arduino cores for ESP32 and RP2040-family chips usually number them.${
        labelsDisagreeWithGpio(located)
          ? " Its labels also carry D-numbers: a core set to number pins by those puts a bare number on a different pin, so write D13 rather than 13 to be exact."
          : ""
      }`;
  }
}

const physicalNote = "Numbers are matched to physical header positions (GPIO.BOARD).";

function uncheckedArduinoNumber(value: number): string {
  return `PinHub's record has no Arduino number ${value} for this board, so this use can't be checked.`;
}

/** The controller MicroPython calls `id` for a peripheral on this board, when the record says. */
function micropythonInstance(board: Board, peripheral: string, id: number): string | undefined {
  return Object.entries(board.pinFunctions?.micropythonBusIds ?? {}).find(
    ([name, busId]) => busId === id && name.startsWith(peripheral),
  )?.[0];
}

type Resolution = { matches: Located[]; reason?: string };

function resolveNumber(ref: PinRef, value: number, board: Board, located: Located[], numbering: Numbering): Resolution {
  if (ref.physical) {
    if (!raspberryPiModel(board.id)) {
      return { matches: [], reason: "Physical (BOARD) numbering only applies to a Raspberry Pi's 40-pin header." };
    }
    const matches = located.filter(({ pin }) => pin.position === value);
    return matches.length ? { matches } : { matches, reason: `PinHub's record has no physical pin ${value} on this header.` };
  }
  if (numbering === "arduino" || numbering === "arduino-labels") {
    if (ref.analogChannel) {
      const analog = located.filter(({ pin }) => pin.mcu?.arduino === `A${value}`);
      if (analog.length) return { matches: analog };
      const byLabel = labelled(located, `A${value}`);
      if (byLabel.length) return { matches: byLabel };
    }
    const matches = located.filter(({ pin }) => pin.mcu?.arduino === String(value));
    if (matches.length) return { matches };
    const byLabel = labelled(located, `D${value}`);
    return byLabel.length ? { matches: byLabel } : { matches: [], reason: uncheckedArduinoNumber(value) };
  }
  let matches = located.filter(({ pin }) => pin.mcu?.gpio === value);
  // A pin the record names GPIOn without a chip record (the Pi's reserved ID pins).
  if (!matches.length) matches = located.filter(({ pin }) => !pin.mcu && pinNames(pin).includes(`GPIO${value}`));
  if (matches.length) return { matches };
  return {
    matches,
    reason: located.some(({ pin }) => pin.mcu?.gpio !== undefined)
      ? `PinHub's record has no GPIO${value} on this board's map, so this use can't be checked.`
      : "PinHub's record gives no GPIO numbers for this board, so a bare number can't be checked. Name the pin the way the record does.",
  };
}

function resolve(ref: PinRef, board: Board, located: Located[], numbering: Numbering): Resolution {
  const spec: PinSpec = ref.spec;
  const signalPins = located.filter(({ pin }) => !["power", "ground"].includes(pin.role) || spec.kind === "number");
  switch (spec.kind) {
    case "onboard-led": {
      const matches = located.filter(({ pin }) => pin.flags?.includes("onboard-led"));
      return matches.length
        ? { matches }
        : { matches, reason: "The record flags no header pin as the onboard LED, so this use can't be checked." };
    }
    case "number":
      return resolveNumber(ref, spec.value, board, located, numbering);
    case "name": {
      const wanted = normalizeName(spec.value);
      const matches = signalPins.filter(({ pin }) => pinNames(pin).includes(wanted));
      return matches.length
        ? { matches }
        : { matches, reason: `PinHub's record has no pin named ${spec.value} on this board, so this use can't be checked.` };
    }
    case "bus-default": {
      const instance = micropythonInstance(board, spec.peripheral, spec.id);
      if (!instance) {
        return { matches: [], reason: `The record doesn't say which ${spec.peripheral} bus MicroPython calls ${spec.id} on this board.` };
      }
      const matches = located.filter(({ pin }) =>
        pin.functions?.some((fn) => fn.instance === instance && fn.signal === spec.signal && fn.default),
      );
      return matches.length
        ? { matches }
        : { matches, reason: `The record names no default ${spec.signal} pin for ${instance}. Pass the pins explicitly.` };
    }
  }
}

/** The silkscreen name: the first part of the label ("D13 / SCK" is D13). */
export function displayName(pin: Pin): string {
  return pin.label.split("/")[0].trim() || pin.label;
}

function identity(found: Located): string {
  return found.pin.mcu?.name ? `mcu:${found.pin.mcu.name}` : `key:${found.key}`;
}

/** Output, PWM, DAC and bus signals that a pin must drive. */
function drives(use: Usage): boolean {
  if (use.kind === "bus") return !["RX", "MISO"].includes(use.signal);
  return use.kind === "output" || use.kind === "pwm" || use.kind === "dac";
}

function functionClass(use: Usage): string | null {
  switch (use.kind) {
    case "adc":
    case "dac":
    case "touch":
      return use.kind;
    case "bus":
      return `${use.peripheral} ${use.signal}`;
    default:
      return null;
  }
}

function lines(refs: readonly PinRef[], predicate: (ref: PinRef) => boolean): string {
  const found = [...new Set(refs.filter(predicate).map((ref) => ref.line))];
  return found.length === 1 ? `line ${found[0]}` : `lines ${found.join(", ")}`;
}

function hasFunction(pin: Pin, board: Board, peripheral: PinPeripheral, signal?: string): boolean {
  return referenceFunctions(pin, board.pinFunctions).some(
    (fn) => fn.peripheral === peripheral && (signal === undefined || fn.signal === signal),
  );
}

/**
 * MicroPython `I2C(0, sda=Pin(2))` on a fixed-mux chip: the pin carries the
 * signal, but for another controller than the id the code opens.
 */
function busMismatch(board: Board, pin: Pin, use: Extract<Usage, { kind: "bus" }>): Finding | null {
  const data = board.pinFunctions;
  if (use.busId === undefined || !data || data.mux.model !== "fixed") return null;
  const instance = micropythonInstance(board, use.peripheral, use.busId);
  if (!instance) return null;
  const carried = (pin.functions ?? []).filter((fn) => fn.peripheral === use.peripheral && fn.signal === use.signal);
  if (!carried.length || carried.some((fn) => fn.instance === instance)) return null;
  const name = displayName(pin);
  const others = [...new Set(carried.map((fn) => fn.instance))].join(" or ");
  const otherId = data.micropythonBusIds?.[carried[0].instance];
  return {
    severity: "fix",
    title: "Wrong bus for this pin",
    detail: `${name} carries ${others} ${use.signal}, but the code opens ${use.peripheral}(${use.busId}), which is ${instance}. ${
      otherId === undefined ? "Use other pins." : `Use ${use.peripheral}(${otherId}) or other pins.`
    }`,
  };
}

// Every finding says only what the board's record states: its role, a flag
// with the source's own note (shown as `quote`), or a function the record
// does not list. Consequences the record does not state are left to the note.
function findingsFor(board: Board, pin: Pin, usages: Usage[], refs: PinRef[], usesWifi: boolean): Finding[] {
  const notes = board.pinFunctions?.flagNotes ?? {};
  const flags = new Set(pin.flags ?? []);
  const findings: Finding[] = [];
  const name = displayName(pin);

  if (pin.role === "power" || pin.role === "ground") {
    findings.push({
      severity: "fix",
      title: pin.role === "power" ? "Power pin" : "Ground pin",
      detail: `The map records ${pin.label} as ${pin.role === "power" ? "a power rail" : "ground"}, not a signal pin.`,
    });
    return findings;
  }

  const drivenUse = usages.find(drives);
  if (flags.has("input-only") && drivenUse) {
    findings.push({
      severity: "fix",
      title: "Input-only pin",
      detail: `Your code uses ${name} as ${article(drivenUse.label)} (${lines(refs, (ref) => drives(ref.usage))}), but the record lists it as input-only.`,
      quote: notes["input-only"],
    });
  }
  if (flags.has("module-memory")) {
    findings.push({
      severity: "check",
      title: "Flash or PSRAM pin",
      detail: `The record lists ${name} as used for flash or PSRAM on some modules. See the source note.`,
      quote: notes["module-memory"],
    });
  }
  if (pin.role === "reserved") {
    findings.push({
      severity: "fix",
      title: "Reserved pin",
      detail: pin.note ?? `The map records ${pin.label} as reserved.`,
    });
  }

  for (const use of usages) {
    if (use.kind === "adc" && !hasFunction(pin, board, "ADC")) {
      findings.push({ severity: "fix", title: "No analog input here", detail: `The record lists no ADC channel on ${name}.` });
    }
    if (use.kind === "dac" && !hasFunction(pin, board, "DAC")) {
      findings.push({ severity: "fix", title: "No analog output here", detail: `The record lists no DAC channel on ${name}.` });
    }
    if (use.kind === "pwm" && board.pinFunctions && !hasFunction(pin, board, "PWM")) {
      findings.push({
        severity: "check",
        title: "No PWM recorded",
        detail: `The record lists no PWM output on ${name}, so this use can't be confirmed.`,
      });
    }
    const wrongBus = use.kind === "bus" && !use.soft ? busMismatch(board, pin, use) : null;
    if (wrongBus) findings.push(wrongBus);
    else if (use.kind === "bus" && !use.soft && board.pinFunctions && !hasFunction(pin, board, use.peripheral, use.signal)) {
      findings.push({
        severity: "check",
        title: `No hardware ${use.peripheral} ${use.signal}`,
        detail: `The record lists no ${use.peripheral} ${use.signal} function on ${name}, so a hardware ${use.peripheral} bus on it can't be confirmed.`,
      });
    }
  }

  if (flags.has("adc-unavailable-with-wifi") && usages.some((use) => use.kind === "adc")) {
    findings.push({
      severity: usesWifi ? "fix" : "check",
      title: usesWifi ? "ADC2 read with Wi-Fi on" : "ADC2 pin and Wi-Fi",
      detail: usesWifi
        ? `Your code starts Wi-Fi, and the record lists ${name} as an ADC2 pin, which the source says can't be used while Wi-Fi is.`
        : `The record lists ${name} as an ADC2 pin, which the source says can't be used while Wi-Fi is.`,
      quote: notes["adc-unavailable-with-wifi"],
    });
  }
  if (flags.has("strapping")) {
    findings.push({
      severity: "check",
      title: "Strapping pin",
      detail: `The record lists ${name} as a strapping pin, read at reset to choose the boot mode. Check what your circuit holds it at during power-on.`,
      quote: notes.strapping,
    });
  }
  if (flags.has("boot")) {
    findings.push({ severity: "check", title: "Boot button pin", detail: `The record lists ${name} as the board's boot pin.`, quote: notes.boot });
  }
  if (flags.has("usb")) {
    findings.push({
      severity: "check",
      title: "Shared with USB or serial",
      detail: `The record lists ${name} as used by the board's USB or serial connection. See the source note.`,
      quote: notes.usb,
    });
  }
  if (flags.has("jtag")) {
    findings.push({ severity: "note", title: "Debug pin", detail: `The record lists ${name} as a debug (JTAG) pin.`, quote: notes.jtag });
  }
  if (flags.has("onboard-led")) {
    findings.push({ severity: "note", title: "Onboard LED", detail: `The record lists ${name} as the board's LED pin.`, quote: notes["onboard-led"] });
  }

  const classes = [...new Set(usages.map(functionClass).filter((value): value is string => value !== null))];
  const digital = usages.filter((use) => use.kind === "output" || use.kind === "pwm");
  if (classes.length > 1 || (classes.some((value) => /^(I2C|SPI|UART) /.test(value)) && digital.length)) {
    const described = [...new Set(usages.filter((use) => use.kind !== "gpio").map((use) => use.label))];
    findings.push({
      severity: "check",
      title: "Used for two things",
      detail: `${name} is used as ${joinList(described.map(article))}.`,
    });
  }

  // PWM and a servo on one pin (both "pwm") would otherwise repeat a finding.
  const seen = new Set<string>();
  return findings.filter((item) => {
    const key = `${item.severity}:${item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function article(label: string): string {
  if (/^(?:I2C|SPI|UART|PWM|Soft|LED|1-Wire)\b/.test(label)) return label;
  const lower = label.toLowerCase();
  return /^[aeiou]/.test(lower) ? `an ${lower}` : `a ${lower}`;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const severityRank: Record<CheckedPin["status"], number> = { fix: 0, check: 1, clear: 2 };

export function checkCode(board: Board, scan: ScanResult): CheckReport {
  const located = locate(board);
  const numbering = numberingFor(board, scan.dialect, located);
  const byId = new Map<string, CheckedPin>();
  const missing: MissingRef[] = [];

  for (const ref of scan.refs) {
    const { matches, reason } = resolve(ref, board, located, numbering);
    if (!matches.length) {
      missing.push({ ref, reason: reason ?? "PinHub's record has no match for this on this board, so it can't be checked." });
      continue;
    }
    const id = identity(matches[0]);
    let entry = byId.get(id);
    if (!entry) {
      // One signal may appear on two connectors (an Arduino header and a morpho header).
      const places = located
        .filter((found) => identity(found) === id || matches.some((match) => match.key === found.key))
        .map(({ key, group, pin }) => ({ key, group, position: pin.position }));
      entry = { id, pin: matches[0].pin, places, usages: [], refs: [], findings: [], status: "clear" };
      byId.set(id, entry);
    }
    entry.refs.push(ref);
    if (!entry.usages.some((use) => use.label === ref.usage.label)) entry.usages.push(ref.usage);
  }

  const pins = [...byId.values()].map((entry) => {
    // A generic "digital I/O" mention adds nothing once the pin has a stated use.
    if (entry.usages.length > 1) entry.usages = entry.usages.filter((use) => use.kind !== "gpio");
    entry.findings = findingsFor(board, entry.pin, entry.usages, entry.refs, scan.usesWifi);
    entry.status = entry.findings.some((item) => item.severity === "fix")
      ? "fix"
      : entry.findings.some((item) => item.severity === "check")
        ? "check"
        : "clear";
    return entry;
  });

  pins.sort((a, b) => severityRank[a.status] - severityRank[b.status] || a.refs[0].start - b.refs[0].start);

  const usesBareNumbers = scan.refs.some((ref) => ref.spec.kind === "number");
  const physical = scan.refs.some((ref) => ref.physical);
  return {
    pins,
    missing,
    unfollowed: scan.unfollowed,
    unfollowedDropped: scan.unfollowedDropped,
    refsCapped: scan.refsCapped,
    counts: {
      fix: pins.filter((pin) => pin.status === "fix").length,
      check: pins.filter((pin) => pin.status === "check").length,
      clear: pins.filter((pin) => pin.status === "clear").length,
    },
    numbering: !usesBareNumbers ? null : physical ? physicalNote : numberingNote(numbering, scan.dialect, located),
  };
}
