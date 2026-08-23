import type { Board } from "@/lib/boards";
import { flattenBoardPins } from "@/lib/board-pins";

/**
 * "Can I move this wiring from board A to board B?"
 *
 * For each bus signal people actually re-wire, report which physical pin
 * carries it on each board. Every answer comes from the board's own pin labels
 * and aliases — nothing is inferred from the chip, and a board with no match
 * reports that plainly rather than borrowing a neighbour's answer.
 */
export type SignalRow = {
  signal: string;
  /** One entry per compared board, in the same order. */
  values: string[];
};

// Matched against the pin label and its aliases, case-insensitively. Each entry
// lists the spellings the catalog actually uses for that signal.
const trackedSignals: { signal: string; patterns: RegExp }[] = [
  { signal: "I2C SDA", patterns: /\bSDA\d*\b/i },
  { signal: "I2C SCL", patterns: /\bSCL\d*\b/i },
  { signal: "SPI MOSI", patterns: /\b(?:MOSI|COPI|SPI\d*\s*TX)\b/i },
  { signal: "SPI MISO", patterns: /\b(?:MISO|CIPO|SPI\d*\s*RX)\b/i },
  { signal: "SPI SCLK", patterns: /\b(?:SCLK|SCK|SPI\d*\s*SCK)\b/i },
  { signal: "UART TX", patterns: /\b(?:TXD?\d*|UART\d*\s*TX)\b/i },
  { signal: "UART RX", patterns: /\b(?:RXD?\d*|UART\d*\s*RX)\b/i },
];

function findSignal(board: Board, patterns: RegExp): string {
  const pins = flattenBoardPins(board);
  if (!pins.length) return "No pin map";

  const hits = pins.filter((entry) =>
    [entry.pin.label, ...(entry.pin.aliases ?? [])].some((token) =>
      patterns.test(token),
    ),
  );
  if (!hits.length) return "Not exposed";

  // Two or three is useful ("either of these"); a long list is noise.
  return hits
    .slice(0, 3)
    .map((entry) => `${entry.pin.label} (pin ${entry.pin.position})`)
    .join(", ")
    .concat(hits.length > 3 ? `, +${hits.length - 3} more` : "");
}

/** The bus-signal rows for a comparison, or null when no board has a map. */
export function signalRowsFor(boards: readonly Board[]): SignalRow[] | null {
  if (!boards.some((board) => board.pinout)) return null;
  return trackedSignals.map(({ signal, patterns }) => ({
    signal,
    values: boards.map((board) => findSignal(board, patterns)),
  }));
}
