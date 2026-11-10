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

type Numbering = "arduino" | "gpio" | "physical";

function numberingFor(board: Board, dialect: ScanResult["dialect"], located: Located[]): Numbering {
  if (dialect === "arduino" && located.some(({ pin }) => pin.mcu?.arduino !== undefined)) return "arduino";
  return "gpio";
}

const numberingNotes: Record<Numbering, string> = {
  arduino: "Bare numbers are matched to this board's Arduino pin numbers, as its core variant names them.",
  gpio: "Bare numbers are matched to GPIO numbers, as the SDK names them.",
  physical: "Numbers are matched to physical header positions (GPIO.BOARD).",
};

const arduinoGpioNote =
  "This board's record names no Arduino pin numbers, so bare numbers are matched to GPIO numbers, as the ESP32 and RP2040 Arduino cores number them.";

type Resolution = { matches: Located[]; reason?: string };

function resolve(ref: PinRef, board: Board, located: Located[], numbering: Numbering): Resolution {
  const spec: PinSpec = ref.spec;
  const signalPins = located.filter(({ pin }) => !["power", "ground"].includes(pin.role) || spec.kind === "number");
  switch (spec.kind) {
    case "onboard-led": {
      const matches = located.filter(({ pin }) => pin.flags?.includes("onboard-led"));
      return matches.length
        ? { matches }
        : { matches, reason: "The record flags no header pin as the onboard LED. It may be wired off the header." };
    }
    case "number": {
      if (ref.physical) {
        if (!raspberryPiModel(board.id)) {
          return { matches: [], reason: "Physical (BOARD) numbering only applies to a Raspberry Pi's 40-pin header." };
        }
        const matches = located.filter(({ pin }) => pin.position === spec.value);
        return matches.length ? { matches } : { matches, reason: `The header has no physical pin ${spec.value}.` };
      }
      if (numbering === "arduino") {
        if (ref.analogChannel) {
          const analog = located.filter(({ pin }) => pin.mcu?.arduino === `A${spec.value}`);
          if (analog.length) return { matches: analog };
        }
        const matches = located.filter(({ pin }) => pin.mcu?.arduino === String(spec.value));
        return matches.length ? { matches } : { matches, reason: `No pin is numbered ${spec.value} on this board's Arduino map.` };
      }
      let matches = located.filter(({ pin }) => pin.mcu?.gpio === spec.value);
      // A pin the record names GPIOn without a chip record (the Pi's reserved ID pins).
      if (!matches.length) matches = located.filter(({ pin }) => !pin.mcu && pinNames(pin).includes(`GPIO${spec.value}`));
      return matches.length
        ? { matches }
        : { matches, reason: `GPIO${spec.value} isn't on this board's pin map. It may be used on the board itself, or not brought out to a header.` };
    }
    case "name": {
      const wanted = normalizeName(spec.value);
      const matches = signalPins.filter(({ pin }) => pinNames(pin).includes(wanted));
      return matches.length ? { matches } : { matches, reason: `No pin named ${spec.value} on this board's map.` };
    }
    case "bus-default": {
      const data = board.pinFunctions;
      const instance = Object.entries(data?.micropythonBusIds ?? {}).find(
        ([name, id]) => id === spec.id && name.startsWith(spec.peripheral),
      )?.[0];
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
  const instance = Object.entries(data.micropythonBusIds ?? {}).find(
    ([name, id]) => id === use.busId && name.startsWith(use.peripheral),
  )?.[0];
  if (!instance) return null;
  const carried = (pin.functions ?? []).filter((fn) => fn.peripheral === use.peripheral && fn.signal === use.signal);
  if (!carried.length || carried.some((fn) => fn.instance === instance)) return null;
  const name = displayName(pin);
  const others = [...new Set(carried.map((fn) => fn.instance))].join(" or ");
  return {
    severity: "fix",
    title: "Wrong bus for this pin",
    detail: `${name} carries ${others} ${use.signal}, but the code opens ${use.peripheral}(${use.busId}), which is ${instance}. Use ${use.peripheral}(${data.micropythonBusIds?.[carried[0].instance] ?? "?"}) or other pins.`,
  };
}

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
      detail: `Your code uses ${name} as ${article(drivenUse.label)} (${lines(refs, (ref) => drives(ref.usage))}), but it can only read.`,
      quote: notes["input-only"],
    });
  }
  if (flags.has("module-memory")) {
    findings.push({
      severity: "fix",
      title: "Wired to flash memory",
      detail: `${name} is connected to the module's flash or PSRAM. Using it can crash the board.`,
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
        detail: `The record lists no PWM output on ${name}. Some libraries fall back to plain on/off or software timing.`,
      });
    }
    const wrongBus = use.kind === "bus" && !use.soft ? busMismatch(board, pin, use) : null;
    if (wrongBus) findings.push(wrongBus);
    else if (use.kind === "bus" && !use.soft && board.pinFunctions && !hasFunction(pin, board, use.peripheral, use.signal)) {
      findings.push({
        severity: "check",
        title: `No hardware ${use.peripheral} ${use.signal}`,
        detail: `The record lists no ${use.peripheral} ${use.signal} function on ${name}. Only a software (bit-banged) bus would work here.`,
      });
    }
  }

  if (flags.has("adc-unavailable-with-wifi") && usages.some((use) => use.kind === "adc")) {
    findings.push({
      severity: usesWifi ? "fix" : "check",
      title: usesWifi ? "Analog read stops with Wi-Fi on" : "Analog read conflicts with Wi-Fi",
      detail: usesWifi
        ? `Your code turns on Wi-Fi, and ${name} is on ADC2.`
        : `${name} is on ADC2. Reads fail while Wi-Fi is running.`,
      quote: notes["adc-unavailable-with-wifi"],
    });
  }
  if (flags.has("strapping")) {
    findings.push({
      severity: "check",
      title: "Strapping pin",
      detail: `${name} is read at reset to choose how the chip boots. A pull-up or pull-down on it at power-on can change how the board starts.`,
      quote: notes.strapping,
    });
  }
  if (flags.has("boot")) {
    findings.push({ severity: "check", title: "Boot button pin", detail: `${name} is also the board's boot pin.`, quote: notes.boot });
  }
  if (flags.has("usb")) {
    findings.push({
      severity: "check",
      title: "Shared with USB serial",
      detail: `${name} carries the board's USB serial link. Wiring to it can interfere with uploads and the serial monitor.`,
      quote: notes.usb,
    });
  }
  if (flags.has("jtag")) {
    findings.push({ severity: "note", title: "Debug pin", detail: `${name} doubles as a JTAG debug pin.`, quote: notes.jtag });
  }
  if (flags.has("onboard-led")) {
    findings.push({ severity: "note", title: "Onboard LED", detail: `${name} also drives the board's LED.`, quote: notes["onboard-led"] });
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

  // PWM and a servo on one pin would otherwise repeat the same finding.
  return findings.filter((item, index) => findings.findIndex((other) => other.title === item.title) === index);
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
      missing.push({ ref, reason: reason ?? "Not on this board's map." });
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
  const arduinoByGpio = scan.dialect === "arduino" && numbering === "gpio";
  return {
    pins,
    missing,
    unfollowed: scan.unfollowed,
    counts: {
      fix: pins.filter((pin) => pin.status === "fix").length,
      check: pins.filter((pin) => pin.status === "check").length,
      clear: pins.filter((pin) => pin.status === "clear").length,
    },
    numbering: !usesBareNumbers ? null : physical ? numberingNotes.physical : arduinoByGpio ? arduinoGpioNote : numberingNotes[numbering],
  };
}
