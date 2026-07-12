import type { ChalkInstance } from "chalk";
import type { Board, Header, Pin } from "../model.js";
import type { CharSet } from "./chars.js";
import { pinStyle, warningStyle } from "./theme.js";

export type RenderOptions = {
  chalk: ChalkInstance;
  chars: CharSet;
  width: number;
  compact: boolean;
};

const INDENT = "  ";

/** Label plus its primary alternate function; reserved pins get a `*` marker. */
function displayLabel(pin: Pin): string {
  const fn = pin.functions?.[0];
  const base = fn && fn !== pin.label ? `${pin.label} / ${fn}` : pin.label;
  return pin.category === "reserved" ? `${base} *` : base;
}

function pinDetails(pin: Pin): string {
  return pin.voltage ? `${pin.category}, ${pin.voltage}` : pin.category;
}

export function wrapText(text: string, width: number, indent: string): string[] {
  const usable = Math.max(20, width - indent.length);
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line && line.length + 1 + word.length > usable) {
      lines.push(indent + line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(indent + line);
  return lines;
}

function byPosition(header: Header, column: number, row: number): Pin | undefined {
  return header.pins.find((p) => p.position.column === column && p.position.row === row);
}

/** Bordered two-column diagram: label | pin | pin | label. */
function renderDualRowTable(header: Header, opts: RenderOptions): string[] | undefined {
  const { chalk: c, chars: ch } = opts;
  const rows: Array<[Pin | undefined, Pin | undefined]> = [];
  for (let r = 1; r <= header.layout.rows; r++) {
    rows.push([byPosition(header, 1, r), byPosition(header, 2, r)]);
  }
  const leftWidth = Math.max(...rows.map(([l]) => (l ? displayLabel(l).length : 0)), 4);
  const rightWidth = Math.max(...rows.map(([, r]) => (r ? displayLabel(r).length : 0)), 4);
  const numWidth = Math.max(
    ...header.pins.map((p) => String(p.physical).length),
    2,
  );
  const totalWidth =
    INDENT.length + leftWidth + rightWidth + 2 * numWidth + 13;
  if (totalWidth > opts.width) return undefined;

  const h = ch.horizontal;
  const seg = (n: number) => h.repeat(n + 2);
  const lines: string[] = [];
  lines.push(
    `${INDENT}${ch.topLeft}${seg(leftWidth)}${ch.topJoin}${seg(numWidth)}${ch.topJoin}${seg(numWidth)}${ch.topJoin}${seg(rightWidth)}${ch.topRight}`,
  );
  for (const [left, right] of rows) {
    const leftLabel = left ? pinStyle(c, left)(displayLabel(left).padEnd(leftWidth)) : " ".repeat(leftWidth);
    const rightLabel = right ? pinStyle(c, right)(displayLabel(right).padEnd(rightWidth)) : " ".repeat(rightWidth);
    const leftNum = left ? String(left.physical).padStart(numWidth) : " ".repeat(numWidth);
    const rightNum = right ? String(right.physical).padStart(numWidth) : " ".repeat(numWidth);
    lines.push(
      `${INDENT}${ch.vertical} ${leftLabel} ${ch.vertical} ${leftNum} ${ch.vertical} ${rightNum} ${ch.vertical} ${rightLabel} ${ch.vertical}`,
    );
  }
  lines.push(
    `${INDENT}${ch.bottomLeft}${seg(leftWidth)}${ch.bottomJoin}${seg(numWidth)}${ch.bottomJoin}${seg(numWidth)}${ch.bottomJoin}${seg(rightWidth)}${ch.bottomRight}`,
  );
  return lines;
}

/** Borderless two-column pairs for --compact / narrower terminals. */
function renderDualRowCompact(header: Header, opts: RenderOptions): string[] | undefined {
  const { chalk: c, chars: ch } = opts;
  const rows: Array<[Pin | undefined, Pin | undefined]> = [];
  for (let r = 1; r <= header.layout.rows; r++) {
    rows.push([byPosition(header, 1, r), byPosition(header, 2, r)]);
  }
  const leftWidth = Math.max(...rows.map(([l]) => (l ? displayLabel(l).length : 0)), 4);
  const rightWidth = Math.max(...rows.map(([, r]) => (r ? displayLabel(r).length : 0)), 4);
  const numWidth = Math.max(...header.pins.map((p) => String(p.physical).length), 2);
  const totalWidth = INDENT.length + leftWidth + 2 + numWidth + 3 + numWidth + 2 + rightWidth;
  if (totalWidth > opts.width) return undefined;

  return rows.map(([left, right]) => {
    const leftLabel = left ? pinStyle(c, left)(displayLabel(left).padStart(leftWidth)) : " ".repeat(leftWidth);
    const rightLabel = right ? pinStyle(c, right)(displayLabel(right)) : "";
    const leftNum = left ? String(left.physical).padStart(numWidth) : " ".repeat(numWidth);
    const rightNum = right ? String(right.physical).padEnd(numWidth) : " ".repeat(numWidth);
    return `${INDENT}${leftLabel}  ${leftNum} ${ch.pairSeparator} ${rightNum}  ${rightLabel}`.trimEnd();
  });
}

/** One pin per line — always fits; last-resort fallback and 1-column layout. */
function renderPinList(header: Header, opts: RenderOptions): string[] {
  const { chalk: c } = opts;
  const pins = [...header.pins].sort((a, b) => a.physical - b.physical);
  const numWidth = Math.max(...pins.map((p) => String(p.physical).length), 2);
  const labelWidth = Math.max(...pins.map((p) => displayLabel(p).length), 4);
  return pins.map((pin) => {
    const label = pinStyle(c, pin)(displayLabel(pin).padEnd(labelWidth));
    return `${INDENT}${String(pin.physical).padStart(numWidth)}  ${label}  ${c.dim(pinDetails(pin))}`;
  });
}

/** Bordered single-column table: # | pin | details. */
function renderSingleColumnTable(header: Header, opts: RenderOptions): string[] | undefined {
  const { chalk: c, chars: ch } = opts;
  const pins = [...header.pins].sort((a, b) => a.physical - b.physical);
  const numWidth = Math.max(...pins.map((p) => String(p.physical).length), 2);
  const labelWidth = Math.max(...pins.map((p) => displayLabel(p).length), 4);
  const detailWidth = Math.max(...pins.map((p) => pinDetails(p).length), 4);
  const totalWidth = INDENT.length + numWidth + labelWidth + detailWidth + 10;
  if (totalWidth > opts.width) return undefined;

  const h = ch.horizontal;
  const seg = (n: number) => h.repeat(n + 2);
  const lines: string[] = [];
  lines.push(
    `${INDENT}${ch.topLeft}${seg(numWidth)}${ch.topJoin}${seg(labelWidth)}${ch.topJoin}${seg(detailWidth)}${ch.topRight}`,
  );
  for (const pin of pins) {
    const label = pinStyle(c, pin)(displayLabel(pin).padEnd(labelWidth));
    lines.push(
      `${INDENT}${ch.vertical} ${String(pin.physical).padStart(numWidth)} ${ch.vertical} ${label} ${ch.vertical} ${pinDetails(pin).padEnd(detailWidth)} ${ch.vertical}`,
    );
  }
  lines.push(
    `${INDENT}${ch.bottomLeft}${seg(numWidth)}${ch.bottomJoin}${seg(labelWidth)}${ch.bottomJoin}${seg(detailWidth)}${ch.bottomRight}`,
  );
  return lines;
}

function renderHeader(header: Header, opts: RenderOptions): string[] {
  const { chalk: c } = opts;
  const lines: string[] = [];
  lines.push(c.bold(header.name));
  if (header.description) {
    lines.push(...wrapText(header.description, opts.width, INDENT).map((l) => c.dim(l)));
  }
  let table: string[] | undefined;
  if (header.layout.columns === 2) {
    table = opts.compact
      ? renderDualRowCompact(header, opts) ?? renderPinList(header, opts)
      : renderDualRowTable(header, opts) ??
        renderDualRowCompact(header, opts) ??
        renderPinList(header, opts);
  } else {
    table = opts.compact ? renderPinList(header, opts) : renderSingleColumnTable(header, opts) ?? renderPinList(header, opts);
  }
  lines.push(...table);
  return lines;
}

function renderLegend(board: Board, opts: RenderOptions): string[] {
  const { chalk: c } = opts;
  if (c.level === 0) return [];
  const order: Pin["category"][] = [
    "power",
    "ground",
    "gpio",
    "digital",
    "analog",
    "communication",
    "reserved",
    "nc",
  ];
  const present = order.filter((cat) =>
    board.headers.some((h) => h.pins.some((p) => p.category === cat)),
  );
  const swatches = present.map((cat) => {
    const sample = board.headers
      .flatMap((h) => h.pins)
      .find((p) => p.category === cat)!;
    return pinStyle(c, sample)(cat);
  });
  return [c.dim("Legend: ") + swatches.join(c.dim(" · "))];
}

export function renderWarnings(board: Board, opts: RenderOptions): string[] {
  const { chalk: c, chars: ch } = opts;
  return board.warnings.flatMap((warning) => {
    const marker = warning.severity === "info" ? ch.info : ch.warn;
    const style = warningStyle(c, warning.severity);
    return wrapText(`${marker} ${warning.text}`, opts.width, "").map((line, i) =>
      style(i === 0 ? line : `  ${line}`),
    );
  });
}

export function renderBoard(board: Board, opts: RenderOptions): string {
  const { chalk: c, chars: ch } = opts;
  const lines: string[] = [];

  lines.push(`${c.bold(board.name)} ${c.dim(`— ${board.manufacturer}`)}`);
  const primarySource = board.sources.find((s) => s.official) ?? board.sources[0];
  if (primarySource) {
    const tag = primarySource.official ? "official" : "third-party";
    lines.push(c.dim(`Source: ${primarySource.title} (${tag}) — see ph ${board.id} --source`));
  }
  if (board.revisionNote) {
    lines.push(
      ...wrapText(`${ch.info} ${board.revisionNote}`, opts.width, "").map((line, i) =>
        c.dim(i === 0 ? line : `  ${line}`),
      ),
    );
  }
  lines.push(...renderWarnings(board, opts));
  lines.push("");

  if (board.headers.length === 0) {
    lines.push(
      c.dim(`No pinout data for this board yet — see ph ${board.id} --source for documentation.`),
    );
  }
  board.headers.forEach((header, index) => {
    if (index > 0) lines.push("");
    lines.push(...renderHeader(header, opts));
  });

  const legend = renderLegend(board, opts);
  if (legend.length > 0) {
    lines.push("");
    lines.push(...legend);
  }
  const hasReserved = board.headers.some((h) => h.pins.some((p) => p.category === "reserved"));
  if (hasReserved) {
    lines.push(c.dim("* reserved / control pin — see warnings above"));
  }
  return lines.join("\n");
}
