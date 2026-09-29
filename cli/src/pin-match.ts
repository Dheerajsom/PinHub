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
  group?: string;
  net?: string;
};
export type PinIndexBoard = { id: string; pins: LookupPin[] };

export function pinQueryTokens(query: string): string[] {
  return query.slice(0, 256).trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, 32);
}

// Function tokens may match a recorded signal word, but never a substring
// (GP2 must not answer GP26). Bare cross-board queries use whole labels only.
export function matchesPin(pin: LookupPin, term: string, exact = false): boolean {
  const needle = term.toLowerCase();
  const names = [pin.label, ...(pin.aliases ?? [])].map((value) => value.toLowerCase());
  if (names.includes(needle)) return true;
  if (exact) return false;
  return pin.role === needle || pin.net?.toLowerCase() === needle ||
    names.some((value) => value.split(/[\s/,]+/).some((word) =>
      word === needle || (/^(sda|scl|mosi|miso|sck|sclk|tx|rx|pwm)$/.test(needle) && new RegExp(`^${needle}\\d+$`).test(word))));
}

export function isPinLikeQuery(query: string): boolean {
  const tokens = pinQueryTokens(query);
  const last = tokens.at(-1) ?? "";
  return /^(?:gp(?:io)?\d+|p[a-z]\d+|[ad]\d+)$/.test(last) ||
    (tokens.length > 1 && (/^(sda|scl|mosi|miso|sck|sclk|tx|rx)\d*$/.test(last) || pinRoles.some((role) => role === last)));
}
