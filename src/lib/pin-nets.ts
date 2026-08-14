// Net derivation: works out which electrical net a pin belongs to so the
// visualization can "ring out" a net the way a bench multimeter does — light
// every pin on the same bus or rail at once.
//
// This file derives, it never declares. Every net comes from data already in
// `boards.ts` (role, label, aliases), so a net can never contradict the
// source-backed pin map. When a pin's net cannot be established from that data
// we return null rather than guessing — a wrong net on a wiring reference is
// worse than no net.

import type { Pin, PinRole } from "@/lib/boards";

export type NetKind = "rail" | "ground" | "bus" | "debug";

export type PinNet = {
  /** Stable identity used to match pins to each other, e.g. "SPI0", "GND". */
  id: string;
  /** Display name. Same as the id today, kept separate for future formatting. */
  label: string;
  kind: NetKind;
};

// Bus families we can name with confidence, and the bare signal-name prefixes
// that identify them. Order matters: prefixes are tried in sequence, so any
// prefix that contains a shorter one ("SCLK" vs "SCL") relies on the
// digits-only suffix check in matchBusSignal to reject the wrong match.
//
// `indexIsSelect` marks prefixes where a trailing number counts something other
// than the bus instance: "CE1" is chip-select 1 of *some* SPI controller, not
// SPI1, so those resolve to the family without an index rather than claiming a
// bus that may not exist.
const BUS_SIGNALS: Array<{
  prefix: string;
  family: string;
  indexIsSelect?: boolean;
}> = [
  // I2C
  { prefix: "SDA", family: "I2C" },
  { prefix: "SCL", family: "I2C" },
  // SPI
  { prefix: "MOSI", family: "SPI" },
  { prefix: "MISO", family: "SPI" },
  { prefix: "SCLK", family: "SPI" },
  { prefix: "SCK", family: "SPI" },
  { prefix: "COPI", family: "SPI" },
  { prefix: "CIPO", family: "SPI" },
  { prefix: "CE", family: "SPI", indexIsSelect: true },
  { prefix: "CS", family: "SPI", indexIsSelect: true },
  { prefix: "SS", family: "SPI", indexIsSelect: true },
  // UART
  { prefix: "TXD", family: "UART" },
  { prefix: "RXD", family: "UART" },
  { prefix: "TX", family: "UART" },
  { prefix: "RX", family: "UART" },
  { prefix: "CTS", family: "UART", indexIsSelect: true },
  { prefix: "RTS", family: "UART", indexIsSelect: true },
  // CAN
  { prefix: "CANH", family: "CAN", indexIsSelect: true },
  { prefix: "CANL", family: "CAN", indexIsSelect: true },
  { prefix: "CTX", family: "CAN" },
  { prefix: "CRX", family: "CAN" },
];

// Protocols that share clock/data signal names with SPI and I2C. When one of
// these appears in a pin's alias, bare-signal matching is skipped so a TDM or
// PCM clock is never reported as an SPI net.
// Matched as a prefix, not a whole word, so instance-suffixed names like
// "TDMB SCLK" are caught alongside a bare "TDM".
const FOREIGN_PROTOCOLS = /\b(TDM|PCM|PDM|SAI|DVP|LCD|CAM|MIPI|SDIO|EMMC)/;

// Debug interfaces. Grouping SWD and JTAG pins is genuinely useful — those pins
// are only ever used together.
const SWD_SIGNALS = ["SWDIO", "SWCLK", "SWO", "SWDCLK", "SWDIOTMS"];
const JTAG_SIGNALS = [
  "TCK",
  "TMS",
  "TDI",
  "TDO",
  "TRST",
  "NTRST",
  "MTCK",
  "MTMS",
  "MTDI",
  "MTDO",
];

/** Explicit "I2C0 SDA" / "SPI0 MOSI" / "UART1 TX" style aliases. */
const EXPLICIT_BUS = /\b(I2C|SPI|UART|USART|SERCOM|QSPI|I2S|CAN)\s*(\d+)?\b/;

// Names that are power rails in their own right. A pin labelled 3V3 and a pin
// labelled 5V are on different nets even though both have role "power", so the
// rail net is taken from the (normalized) label rather than the role.
function normalizeRail(label: string): string {
  const clean = label.toUpperCase().replace(/\s+/g, "").replace(/-/g, "_");
  const compact = clean.replace(/_/g, "");
  // Common spellings of the same rail so 3.3V / 3V3 / +3V3 all ring out together.
  if (/^\+?3(\.)?3V?$|^3V3$/.test(compact)) return "3V3";
  if (/^\+?5V?$|^5V0$/.test(compact)) return "5V";
  if (/^\+?1(\.)?8V?$|^1V8$/.test(compact)) return "1V8";
  return clean;
}

const CONNECTOR_POSITION = /^(?:P|J)\d+[._]\d+$/;
const CANONICAL_VOLTAGE_RAILS = new Set(["1V8", "3V3", "5V"]);

function labelParts(tokens: string[]): string[] {
  return tokens.flatMap((token) =>
    token
      .split(/\s+\/\s+/)
      .map((part) => part.trim())
      .filter(Boolean),
  );
}

function railFromTokens(tokens: string[]): string {
  const parts = labelParts(tokens);
  const normalized = parts.map(normalizeRail);
  const voltage = normalized.find((part) => CANONICAL_VOLTAGE_RAILS.has(part));
  if (voltage) return voltage;

  const namedRail = normalized.find((part) => !CONNECTOR_POSITION.test(part));
  return namedRail ?? normalizeRail(tokens[0]);
}

function groundFromTokens(tokens: string[]): string {
  const grounds = labelParts(tokens)
    .map(normalizeRail)
    .filter((part) => part.includes("GND"));
  return grounds.find((part) => part !== "GND") ?? grounds[0] ?? "GND";
}

function matchBusSignal(token: string): { family: string; index: string } | null {
  const clean = token.toUpperCase().replace(/[\s_-]+/g, "");
  for (const { prefix, family, indexIsSelect } of BUS_SIGNALS) {
    if (!clean.startsWith(prefix)) continue;
    const rest = clean.slice(prefix.length);
    // Accept a trailing number ("SDA1") or nothing ("SDA"). Anything else means
    // we matched a coincidental prefix, so keep looking.
    if (rest !== "" && !/^\d+$/.test(rest)) continue;
    return { family, index: indexIsSelect ? "" : rest };
  }
  return null;
}

function busFromTokens(tokens: string[], role: PinRole): PinNet | null {
  for (const token of tokens) {
    const explicit = EXPLICIT_BUS.exec(token.toUpperCase());
    if (explicit) {
      const family = explicit[1] === "USART" ? "UART" : explicit[1];
      return net(`${family}${explicit[2] ?? ""}`, "bus");
    }
  }
  for (const token of tokens) {
    // A token naming another protocol that borrows SPI/I2C signal names would
    // otherwise resolve through the bare-signal table to the wrong bus.
    if (FOREIGN_PROTOCOLS.test(token.toUpperCase())) continue;
    // Aliases can carry several signals ("SPI0 SCLK / I2C1 SCL"); split so each
    // word gets a chance to match a bare signal name.
    for (const word of token.split(/[\s/,]+/)) {
      const hit = matchBusSignal(word);
      if (hit) return net(`${hit.family}${hit.index}`, "bus");
    }
  }
  // Role tells us it is a bus pin but the data does not name the instance. A
  // family-level net is still useful ("show me every I2C pin").
  if (role === "i2c" || role === "spi" || role === "uart") {
    return net(role.toUpperCase(), "bus");
  }
  return null;
}

function debugFromTokens(tokens: string[]): PinNet | null {
  for (const token of tokens.flatMap((value) => value.split(/[\s/,]+/))) {
    const clean = token.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!clean) continue;

    if (JTAG_SIGNALS.includes(clean) || /^JTAG(?:TCK|TMS|TDI|TDO|TRST|NTRST)$/.test(clean)) {
      return net("JTAG", "debug");
    }
    if (clean === "SBWTCK" || clean === "SBWTDIO") return net("SBW", "debug");

    const swdSignal = SWD_SIGNALS.find((signal) => clean.endsWith(signal));
    if (swdSignal) {
      const target = clean.slice(0, -swdSignal.length);
      return net(target ? `${target}_SWD` : "SWD", "debug");
    }
  }
  return null;
}

function net(id: string, kind: NetKind): PinNet {
  return { id, label: id, kind };
}

/**
 * The net a pin sits on, or null when the pin is its own island (a plain GPIO,
 * an ADC input, a strapping pin) or when the data does not support a confident
 * answer.
 */
export function netForPin(pin: Pin): PinNet | null {
  const tokens = [pin.label, ...(pin.aliases ?? [])];

  if (pin.role === "ground") {
    // Named analog/reference grounds are separate from digital ground on every
    // board that bothers to break them out, so they are kept distinct.
    return net(groundFromTokens(tokens), "ground");
  }

  if (pin.role === "power") {
    return net(railFromTokens(tokens), "rail");
  }

  if (pin.role === "debug") {
    // Different devices on one board can expose independent debug ports. If a
    // target/interface cannot be named, do not claim those pins are connected.
    return debugFromTokens(tokens);
  }

  if (pin.role === "i2c" || pin.role === "spi" || pin.role === "uart") {
    return busFromTokens(tokens, pin.role);
  }

  // Everything else (gpio, adc, dac, pwm, system, special, reserved) is treated
  // as a single-pin net. Buses and rails are where "what else is on this net?"
  // is a real question; a GPIO's neighbours are not electrically related.
  // A CAN pair hiding under role "special"/"alt" is still worth catching.
  return busFromTokens(tokens, pin.role);
}

/** Human summary for the probe readout, e.g. "SPI0 bus" / "GND". */
export function netDescription(net: PinNet): string {
  if (net.kind === "ground") return net.label;
  if (net.kind === "rail") return `${net.label} rail`;
  if (net.kind === "debug") return `${net.label} debug`;
  return `${net.label} bus`;
}
