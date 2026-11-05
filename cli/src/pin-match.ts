// AUTO-GENERATED from src/lib/pin-match.ts; do not edit.
// Self-contained matching rules, also generated into the standalone CLI.
export const pinRoles = ["power", "ground", "gpio", "i2c", "spi", "uart", "adc", "dac", "pwm", "debug", "system", "special", "reserved"] as const;
export type LookupRole = typeof pinRoles[number];
export type LookupPin = {
  key: string;
  position: number;
  label: string;
  role: LookupRole;
  aliases?: string[];
  note?: string;
  flags?: string[];
  /** Source-backed peripheral/signal tokens, including recorded mux routes. */
  signals?: string[];
  /** Recorded digital capability; analog-only MCU pads are false. */
  gpio?: boolean;
  /** Signals explicitly marked as defaults in the board's source-backed data. */
  defaultSignals?: string[];
  group?: string;
  net?: string;
};
export type PinIndexBoard = { id: string; pins: LookupPin[] };

export function pinQueryTokens(query: string): string[] {
  return query.slice(0, 256).trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, 32);
}

// Function tokens may match a recorded signal word, but never a substring
// (GP2 must not answer GP26). Bare cross-board queries use whole labels only.
/** GPIO namespaces explicitly used by the catalog: numeric, banked and Amlogic forms. */
export function isRecordedGpioName(value: string): boolean {
  return /^GPIO(?:_?\d+(?:[_.:][a-z]?\d+)?|[a-z]+[_.]\d+)(?=$|[\s/,(])/i.test(value.trim());
}

const signalFamilies: Record<string, RegExp> = {
  pwm: /^(?:ehr|e)?pwm\d*[a-z]?$/,
  uart: /^(?:uart|usart|lpuart)\d*$/,
  spi: /^(?:spi|hspi|vspi|qspi)\d*$/,
  i2c: /^(?:i2c|twi)\d*$/,
  adc: /^adc\d*$/,
  dac: /^dac\d*$/,
};

function signalWordMatches(word: string, needle: string): boolean {
  if (word === needle) return true;
  if (/^(sda|scl|mosi|miso|sck|sclk|tx|rx)$/.test(needle)) return word.startsWith(needle) && /^\d+$/.test(word.slice(needle.length));
  return Object.hasOwn(signalFamilies, needle) ? signalFamilies[needle].test(word) : false;
}

/** Match recorded signal/net names without losing controller suffixes. */
export function matchesSignalValue(value: string, term: string): boolean {
  const words = value.toLowerCase().split(/[\s/,_-]+/);
  const needle = term.toLowerCase();
  // SCK denotes the I2C clock only inside an explicit TWI alias.
  if (needle === "scl" && words.some((word) => /^twi\d*$/.test(word)) && words.some((word) => /^sck\d*$/.test(word))) return true;
  return words.some((word) => signalWordMatches(word, needle));
}

export function matchesPin(pin: LookupPin, term: string, exact = false): boolean {
  const needle = term.toLowerCase();
  if (!exact && ["power", "ground", "reserved"].includes(pin.role) && /^(gpio|adc|dac|pwm|i2c|spi|uart)$/.test(needle)) return false;
  if (!exact && pin.flags?.includes("input-only") && /^(pwm|dac|i2c|sda|scl|mosi|sck|sclk|tx)\d*$/.test(needle)) return false;
  const names = [pin.label, ...(pin.aliases ?? [])].map((value) => value.toLowerCase());
  if (names.includes(needle)) return true;
  if (exact) return false;
  if (needle === "gpio") return pin.gpio ?? pin.role === "gpio";
  return pin.role === needle || (pin.net !== undefined && matchesSignalValue(pin.net, needle)) || pin.signals?.some((signal) => matchesSignalValue(signal, needle)) ||
    names.some((value) => matchesSignalValue(value, needle));
}

export function isPinLikeQuery(query: string): boolean {
  const tokens = pinQueryTokens(query);
  const last = tokens.at(-1) ?? "";
  return isRecordedGpioName(last) || /^(?:gp(?:io)?\d+|p[a-z]\d+|[ad]\d+)$/.test(last) ||
    (tokens.length > 1 && (/^(sda|scl|mosi|miso|sck|sclk|tx|rx)\d*$/.test(last) || pinRoles.some((role) => role === last)));
}

/** Board lists search the board qualifier; the on-demand lookup answers the signal. */
export function pinBoardQuery(query: string): string {
  if (!isPinLikeQuery(query)) return query;
  return pinQueryTokens(query).slice(0, -1).join(" ");
}
