// Board-to-board link: the wire list that joins two catalog boards over one
// bus, worked out from each board's own pin map.
//
// Like pin nets, this derives and never declares. A signal comes from a pin's
// source-backed functions where the board has them, otherwise from the signal
// names its label and aliases already carry. When the data cannot name a
// complete bus, or cannot settle the logic levels, the link says so instead of
// guessing: a wrong wire between two boards can damage both.
//
// SPI is deliberately absent. One board must run as an SPI peripheral, and
// which data pin is the input in that mode depends on the chip's controller
// (an RP2040's SPI TX pin stays an output), which no record states.

import type { Board, Pin } from "@/lib/boards";
import { getBoardDiscoveryProfile, type LogicProfile } from "@/lib/board-discovery";
import { fiveVoltCaution } from "@/lib/board-utilities";
import { FOREIGN_PROTOCOLS, netForPin } from "@/lib/pin-nets";
import { claimCautions, type ClaimCaution } from "@/lib/planner-claims";

export const linkBuses = ["uart", "i2c"] as const;
export type LinkBus = (typeof linkBuses)[number];

type Family = "UART" | "I2C";
type Signal = "TX" | "RX" | "SDA" | "SCL";

export const busNames: Record<LinkBus, string> = { uart: "UART", i2c: "I2C" };

const familyFor: Record<LinkBus, Family> = { uart: "UART", i2c: "I2C" };
const requiredSignals: Record<Family, Signal[]> = { UART: ["TX", "RX"], I2C: ["SDA", "SCL"] };

export type BusSignal = { family: Family; instance: string; signal: Signal; isDefault: boolean };

// One spelling of a bus signal, after separators are removed: an optional
// controller prefix and number, the signal, and an optional trailing number
// ("U0TXD", "I2C3SDA", "TWI1SCK", "SDA1", "TX0", "UARTRXD").
const signalPattern = /^(I2C|TWI|USART|UART|U)?(\d*)(SDA|SCL|SCK|CLK|DAT|TXD|RXD|TXO|RXI|TX|RX)(\d*)$/;

const signalWords: Record<string, { family: Family; signal: Signal; needsI2cPrefix?: true }> = {
  SDA: { family: "I2C", signal: "SDA" },
  SCL: { family: "I2C", signal: "SCL" },
  // Clock and data spellings that only mean I2C under an I2C or TWI prefix.
  // A bare SCK or CLK is an SPI clock.
  DAT: { family: "I2C", signal: "SDA", needsI2cPrefix: true },
  SCK: { family: "I2C", signal: "SCL", needsI2cPrefix: true },
  CLK: { family: "I2C", signal: "SCL", needsI2cPrefix: true },
  TX: { family: "UART", signal: "TX" },
  TXD: { family: "UART", signal: "TX" },
  TXO: { family: "UART", signal: "TX" },
  RX: { family: "UART", signal: "RX" },
  RXD: { family: "UART", signal: "RX" },
  RXI: { family: "UART", signal: "RX" },
};

function parsePart(part: string): BusSignal | null {
  if (FOREIGN_PROTOCOLS.test(part.toUpperCase())) return null;
  const compact = part
    .toUpperCase()
    .trim()
    // Pin-mux and active-low suffixes: "I2C4_SDA_M0", "SPI1_CS0_N".
    .replace(/[-_ ]M\d+$/, "")
    .replace(/[-_ ]N$/, "")
    .replace(/[-_ .]+/g, "");
  const match = signalPattern.exec(compact);
  if (!match) return null;
  const [, prefix = "", prefixNumber, word, trailingNumber] = match;
  const meaning = signalWords[word];
  const i2cPrefix = prefix === "I2C" || prefix === "TWI";
  const uartPrefix = prefix === "UART" || prefix === "USART" || prefix === "U";
  if (meaning.needsI2cPrefix && !i2cPrefix) return null;
  if ((i2cPrefix && meaning.family !== "I2C") || (uartPrefix && meaning.family !== "UART")) return null;
  const number = prefixNumber || trailingNumber;
  // Only a number names an instance. "UART TX" and "SDA" say the bus family
  // and nothing more, so they never join a numbered controller.
  const name = prefix === "U" ? "UART" : prefix || meaning.family;
  return {
    family: meaning.family,
    instance: number ? `${name}${number}` : "",
    signal: meaning.signal,
    isDefault: false,
  };
}

/**
 * The UART and I2C signals a pin carries. Source-backed functions win when the
 * pin has them; otherwise the signal names in its label and aliases are read.
 * Rails, grounds, and debug pins never carry a link signal.
 */
export function busSignalsForPin(pin: Pin): BusSignal[] {
  if (pin.role === "power" || pin.role === "ground" || pin.role === "debug") return [];
  if (pin.functions) {
    return pin.functions.flatMap((item) => {
      if (item.peripheral !== "UART" && item.peripheral !== "I2C") return [];
      if (!requiredSignals[item.peripheral].includes(item.signal as Signal)) return [];
      return [
        {
          family: item.peripheral,
          instance: item.instance,
          signal: item.signal as Signal,
          isDefault: item.default === true,
        },
      ];
    });
  }
  const parts = [pin.label, ...(pin.aliases ?? [])].flatMap((token) => token.split(/[/,]/));
  const found: BusSignal[] = [];
  for (const part of parts) {
    const hit = parsePart(part);
    if (hit && !found.some((item) => item.instance === hit.instance && item.signal === hit.signal)) {
      found.push(hit);
    }
  }
  return found;
}

type PlacedPin = { pin: Pin; group?: string; order: number };

function placedPins(board: Board): PlacedPin[] {
  const pinout = board.pinout;
  if (!pinout) return [];
  const list = pinout.pins
    ? [...pinout.pins.left, ...pinout.pins.right]
        .sort((x, y) => x.position - y.position)
        .map((pin) => ({ pin }))
    : (pinout.groups ?? []).flatMap((group) => group.pins.map((pin) => ({ pin, group: group.label })));
  return list.map((item, order) => ({ ...item, order }));
}

export type PortPin = PlacedPin & { isDefault: boolean; cautions: ClaimCaution[] };

export type LinkPort = {
  /** Stable id for the URL: the instance, or `FAMILY~group` for an unnamed bus. */
  id: string;
  family: Family;
  /** The controller as the source names it, or "" when the data does not name one. */
  instance: string;
  label: string;
  /** Candidate pins per signal, best first. */
  signals: Partial<Record<Signal, PortPin[]>>;
  complete: boolean;
  missing: Signal[];
};

function pinCautions(board: Board, pin: Pin): ClaimCaution[] {
  const cautions = claimCautions(board, pin);
  if (pin.note && pin.role !== "reserved") cautions.push({ label: "note", note: pin.note });
  return cautions;
}

function rankPins(pins: PortPin[]): PortPin[] {
  return [...pins].sort(
    (x, y) =>
      Number(y.isDefault) - Number(x.isDefault) ||
      x.cautions.length - y.cautions.length ||
      x.order - y.order,
  );
}

function chosenCautions(port: LinkPort): number {
  return Object.values(port.signals).reduce((sum, pins) => sum + (pins?.[0]?.cautions.length ?? 0), 0);
}

/** Every bus of this kind the board's pin map names, the most usable first. */
export function linkPorts(board: Board, bus: LinkBus): LinkPort[] {
  const family = familyFor[bus];
  const ports = new Map<string, LinkPort & { first: number; hasDefault: boolean }>();

  for (const placed of placedPins(board)) {
    for (const hit of busSignalsForPin(placed.pin)) {
      if (hit.family !== family) continue;
      // An unnamed bus is only known to be one bus within one connector.
      const id = hit.instance || (placed.group ? `${family}~${placed.group}` : family);
      let port = ports.get(id);
      if (!port) {
        port = {
          id,
          family,
          instance: hit.instance,
          label: hit.instance || (placed.group ? `${family} · ${placed.group}` : family),
          signals: {},
          complete: false,
          missing: [],
          first: placed.order,
          hasDefault: false,
        };
        ports.set(id, port);
      }
      const list = (port.signals[hit.signal] ??= []);
      if (!list.some((item) => item.pin === placed.pin)) {
        list.push({ ...placed, isDefault: hit.isDefault, cautions: pinCautions(board, placed.pin) });
      }
      port.hasDefault ||= hit.isDefault;
    }
  }

  return [...ports.values()]
    .map((port) => {
      for (const signal of Object.keys(port.signals) as Signal[]) {
        port.signals[signal] = rankPins(port.signals[signal] ?? []);
      }
      const missing = requiredSignals[family].filter((signal) => !port.signals[signal]?.length);
      return { ...port, missing, complete: missing.length === 0 };
    })
    .sort(
      (x, y) =>
        Number(y.complete) - Number(x.complete) ||
        Number(y.hasDefault) - Number(x.hasDefault) ||
        chosenCautions(x) - chosenCautions(y) ||
        x.first - y.first,
    )
    .map((port) => ({
      id: port.id,
      family: port.family,
      instance: port.instance,
      label: port.label,
      signals: port.signals,
      complete: port.complete,
      missing: port.missing,
    }));
}

function groundFor(board: Board, near?: string): PlacedPin | null {
  const grounds = placedPins(board).filter((item) => item.pin.role === "ground");
  const digital = grounds.filter((item) => netForPin(item.pin)?.id === "GND");
  const pool = digital.length
    ? digital
    : grounds.filter((item) => !/^A|ANALOG|AGND|GNDA/.test(netForPin(item.pin)?.id ?? ""));
  return pool.find((item) => item.group === near) ?? pool[0] ?? null;
}

export type WireEnd = {
  pin: Pin;
  group?: string;
  signal: string;
  /** Other pins the same controller signal is available on. */
  alternatives: Pin[];
  cautions: ClaimCaution[];
};

export type LinkWire = {
  kind: "signal" | "ground";
  name: string;
  /** Which way the signal travels; "both" for a shared I2C line, "shared" for ground. */
  direction: "a-to-b" | "b-to-a" | "both" | "shared";
  a: WireEnd;
  b: WireEnd;
  viaShifter: boolean;
};

export type LevelCheck = {
  kind: "match" | "shift" | "check";
  title: string;
  detail: string;
};

export type LinkStatus = "ready" | "shift" | "check" | "blocked";

export type BoardLink = {
  bus: LinkBus;
  ports: { a: LinkPort[]; b: LinkPort[] };
  port: { a: LinkPort | null; b: LinkPort | null };
  wires: LinkWire[];
  level: LevelCheck;
  status: LinkStatus;
  blockers: string[];
  notes: string[];
};

const voltageOrder: Partial<Record<LogicProfile, number>> = { "1.8 V": 1.8, "3.3 V": 3.3, "5 V": 5 };

function levelCheck(a: Board, b: Board, bus: LinkBus): LevelCheck {
  const pa = getBoardDiscoveryProfile(a).logicProfile;
  const pb = getBoardDiscoveryProfile(b).logicProfile;
  const sides: [Board, LogicProfile][] = [
    [a, pa],
    [b, pb],
  ];
  const unsettled = sides.filter(([, profile]) => voltageOrder[profile] === undefined);

  if (unsettled.length) {
    const unique = unsettled.filter(([board], index) => index === 0 || board.id !== unsettled[0][0].id);
    return {
      kind: "check",
      title: "Check the logic levels",
      detail: `${unique
        .map(([board]) => `${board.name} records “${board.logicLevel}”`)
        .join(" and ")}, which does not settle one logic level for these pins. Confirm both levels in the datasheets before wiring directly.`,
    };
  }

  if (pa === pb) {
    return {
      kind: "match",
      title: `Both boards use ${pa} logic`,
      detail: `Both records state ${pa} logic, so the signal wires need no level shifter.`,
    };
  }

  const [lower, lowerProfile, higher, higherProfile] =
    (voltageOrder[pa] ?? 0) < (voltageOrder[pb] ?? 0) ? [a, pa, b, pb] : [b, pb, a, pa];
  let risk = "Neither record says these two levels can be wired directly.";
  if (higherProfile === "5 V" && lowerProfile === "3.3 V") {
    const caution = fiveVoltCaution(lower);
    risk =
      caution === "Not 5 V tolerant"
        ? `${lower.name}’s record states it is not 5 V tolerant, so a direct wire can damage it.`
        : caution
          ? `${lower.name}’s record does not state 5 V tolerance, so treat a direct wire as unsafe.`
          : `${lower.name}’s record mentions 5 V tolerance, but not whether its 3.3 V outputs reach ${higher.name}’s input threshold, so PinHub does not call a direct wire safe.`;
  }
  return {
    kind: "shift",
    title: "Level shifter required",
    detail: `${higher.name} uses ${higherProfile} logic and ${lower.name} uses ${lowerProfile}. ${risk} Put a level shifter on every signal wire${
      bus === "i2c" ? ", one made for I2C’s bidirectional open-drain lines" : ""
    }.`,
  };
}

const powerNote =
  "This list joins signals and ground only. Power each board from its own supply unless both datasheets say a shared rail is safe.";
const busNotes: Record<LinkBus, string[]> = {
  uart: ["Set the same baud rate and frame format on both boards."],
  i2c: [
    "I2C needs pull-up resistors on SDA and SCL. Check the pin notes and both boards’ documentation for on-board pull-ups before adding your own.",
    "One board must run as the I2C target. Whether it can depends on its chip and software; the record lists pins, not modes.",
  ],
};

function pick(ports: LinkPort[], id: string | undefined): LinkPort | null {
  const complete = ports.filter((port) => port.complete);
  return complete.find((port) => port.id === id) ?? complete[0] ?? null;
}

function end(port: LinkPort, signal: Signal): WireEnd {
  const [chosen, ...rest] = port.signals[signal] ?? [];
  return {
    pin: chosen.pin,
    ...(chosen.group ? { group: chosen.group } : {}),
    signal: port.instance ? `${port.instance} ${signal}` : signal,
    alternatives: rest.map((item) => item.pin),
    cautions: chosen.cautions,
  };
}

function groundEnd(board: Board, ground: PlacedPin): WireEnd {
  return {
    pin: ground.pin,
    ...(ground.group ? { group: ground.group } : {}),
    signal: "GND",
    alternatives: [],
    cautions: pinCautions(board, ground.pin),
  };
}

function blockerFor(board: Board, ports: LinkPort[], bus: LinkBus): string {
  const name = busNames[bus];
  const best = ports[0];
  if (!best) return `PinHub’s pin map for ${board.name} names no ${name} pins.`;
  const have = requiredSignals[best.family].filter((signal) => !best.missing.includes(signal));
  return `PinHub’s pin map for ${board.name} names ${best.label} ${have.join(" and ")} but no ${best.missing.join(" or ")}.`;
}

/**
 * The wires that join board A to board B over one bus, with the logic-level
 * verdict and every caution the records state for the chosen pins. `choice`
 * picks a port id per side; an id that is not a complete port is ignored.
 */
export function buildBoardLink(
  a: Board,
  b: Board,
  bus: LinkBus,
  choice: { a?: string; b?: string } = {},
): BoardLink {
  const ports = { a: linkPorts(a, bus), b: linkPorts(b, bus) };
  const port = { a: pick(ports.a, choice.a), b: pick(ports.b, choice.b) };
  const level = levelCheck(a, b, bus);
  const blockers: string[] = [];

  for (const [board, side] of [
    [a, "a"],
    [b, "b"],
  ] as const) {
    if (!board.pinout) blockers.push(`${board.name} has no pin map in PinHub, so there are no pins to link.`);
    else if (!port[side]) blockers.push(blockerFor(board, ports[side], bus));
  }

  const firstGroup = (side: "a" | "b") => {
    const chosen = port[side];
    return chosen ? Object.values(chosen.signals)[0]?.[0]?.group : undefined;
  };
  const ground = { a: groundFor(a, firstGroup("a")), b: groundFor(b, firstGroup("b")) };
  for (const [board, side] of [
    [a, "a"],
    [b, "b"],
  ] as const) {
    if (board.pinout && !ground[side]) {
      blockers.push(`PinHub’s pin map for ${board.name} has no ground pin, and a link needs a shared ground.`);
    }
  }

  const notes = [powerNote, ...busNotes[bus]];
  if (blockers.length || !port.a || !port.b || !ground.a || !ground.b) {
    return { bus, ports, port, wires: [], level, status: "blocked", blockers, notes };
  }

  const viaShifter = level.kind === "shift";
  const signalWires: LinkWire[] =
    bus === "uart"
      ? [
          { kind: "signal", name: "TX → RX", direction: "a-to-b", a: end(port.a, "TX"), b: end(port.b, "RX"), viaShifter },
          { kind: "signal", name: "RX ← TX", direction: "b-to-a", a: end(port.a, "RX"), b: end(port.b, "TX"), viaShifter },
        ]
      : [
          { kind: "signal", name: "SDA", direction: "both", a: end(port.a, "SDA"), b: end(port.b, "SDA"), viaShifter },
          { kind: "signal", name: "SCL", direction: "both", a: end(port.a, "SCL"), b: end(port.b, "SCL"), viaShifter },
        ];
  const wires: LinkWire[] = [
    ...signalWires,
    {
      kind: "ground",
      name: "GND",
      direction: "shared",
      a: groundEnd(a, ground.a),
      b: groundEnd(b, ground.b),
      viaShifter: false,
    },
  ];

  return {
    bus,
    ports,
    port,
    wires,
    level,
    status: level.kind === "match" ? "ready" : level.kind,
    blockers,
    notes,
  };
}

function endText(boardName: string, wireEnd: WireEnd): string {
  const where = wireEnd.group ? `${wireEnd.group} pin ${wireEnd.pin.position}` : `pin ${wireEnd.pin.position}`;
  return `${boardName} ${where} ${wireEnd.pin.label}`;
}

/** The wire list as plain text, for the bench or a project README. */
export function linkToText(link: BoardLink, a: Board, b: Board): string {
  const lines = [`PinHub link · ${busNames[link.bus]} · ${a.name} ↔ ${b.name}`, `Levels: ${link.level.title}`];
  if (link.status === "blocked") {
    lines.push(...link.blockers);
  } else {
    link.wires.forEach((wire, index) => {
      const arrow = wire.direction === "a-to-b" ? "→" : wire.direction === "b-to-a" ? "←" : "—";
      lines.push(
        `${index + 1}. ${wire.name}: ${endText(a.name, wire.a)} ${arrow} ${endText(b.name, wire.b)}${
          wire.viaShifter ? " [via level shifter]" : ""
        }`,
      );
    });
  }
  lines.push(...link.notes);
  return lines.join("\n");
}
