import type { Board } from "@/lib/boards";
import type { BoardLink, LinkBus } from "@/lib/board-link";

// The "before you connect" list, short enough to be read. The full notes stay
// in `link.notes` and in the copied wire list; this only decides what is shown
// first. It filters the records' own warnings and never rewords one, so no
// electrical claim is made here that a record does not state.

export type LinkCheck = { title: string; detail: string };
export type BoardNote = { board: string; text: string };
export type LinkChecklist = {
  /** The steps every link of this bus needs, in a few words each. */
  essentials: LinkCheck[];
  /** Board warnings that bear on this link: its bus, its pins, logic levels, or the board revision. */
  relevant: BoardNote[];
  /** Every other board warning, kept one click away. */
  more: BoardNote[];
};

const essentials: Record<LinkBus, LinkCheck[]> = {
  uart: [
    { title: "Ground only", detail: "Join GND. Keep each board on its own supply unless both datasheets allow sharing." },
    { title: "Match settings", detail: "Same baud rate and frame format on both boards." },
  ],
  i2c: [
    { title: "Ground only", detail: "Join GND. Keep each board on its own supply unless both datasheets allow sharing." },
    { title: "Pull-ups", detail: "SDA and SCL need them. Check for on-board pull-ups before adding your own." },
    { title: "One target", detail: "One board must run as the I2C target; the record lists pins, not modes." },
  ],
};

const busWords: Record<LinkBus, RegExp> = {
  uart: /\b(u?s?art\d*|serial|tx\d*|rx\d*|baud|console)\b/i,
  i2c: /\b(i2c\d*|sda\d*|scl\d*|twi|pull-?ups?|qwiic|stemma)\b/i,
};

// Logic levels and the board's revision decide whether a wire list is safe or
// even the right one, whatever bus it carries.
const alwaysRelevant = [
  /\btolerant\b/i,
  /\blogic\b/i,
  /\blevel[- ]shift/i,
  /\b\d(?:\.\d+)?\s?V\b/,
  /\b(revisions?|rev\.?|variants?|older|newer)\b/i,
];

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Does a warning name one of the linked pins, by label or by number? */
function namesPin(text: string, labels: string[], positions: number[]): boolean {
  for (const label of labels) {
    if (new RegExp(`(^|[^A-Za-z0-9])${escape(label)}(?![A-Za-z0-9])`, "i").test(text)) return true;
  }
  // "pins 8 and 10", "pin 3": only numbers that follow the word "pin".
  for (const match of text.matchAll(/\bpins?\s+((?:\d+(?:\s*(?:,|and|or|&|\/)\s*)?)+)/gi)) {
    const numbers = match[1].match(/\d+/g)?.map(Number) ?? [];
    if (numbers.some((n) => positions.includes(n))) return true;
  }
  return false;
}

function linkedPins(link: BoardLink, side: "a" | "b") {
  const labels = new Set<string>();
  const positions = new Set<number>();
  for (const wire of link.wires) {
    if (wire.kind === "ground") continue; // every board has ground notes; they are not about this link
    const end = wire[side];
    positions.add(end.pin.position);
    for (const segment of end.pin.label.split("/")) {
      const name = segment.trim();
      if (name.length >= 2) labels.add(name);
    }
  }
  return { labels: [...labels], positions: [...positions] };
}

export function linkChecklist(link: BoardLink, a: Board, b: Board): LinkChecklist {
  const relevant: BoardNote[] = [];
  const more: BoardNote[] = [];
  const sides = a.id === b.id ? ([[a, "a"]] as const) : ([[a, "a"], [b, "b"]] as const);
  for (const [board, side] of sides) {
    const pins = linkedPins(link, side);
    if (a.id === b.id) {
      const other = linkedPins(link, "b");
      pins.labels.push(...other.labels);
      pins.positions.push(...other.positions);
    }
    for (const text of board.warnings) {
      const note = { board: board.name, text };
      const bears =
        busWords[link.bus].test(text) ||
        alwaysRelevant.some((pattern) => pattern.test(text)) ||
        namesPin(text, pins.labels, pins.positions);
      (bears ? relevant : more).push(note);
    }
  }
  return { essentials: essentials[link.bus], relevant, more };
}
