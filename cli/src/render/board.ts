import type { ChalkInstance } from "chalk";
import type { Board, Header, Pin, WarningSeverity } from "../model.js";
import { asciiChars, type CharSet } from "./chars.js";
import {
  normalizeWidth,
  padEndVisible,
  padStartVisible,
  toAscii,
  visibleWidth,
  wrapText,
} from "./text.js";
import { pinStyle, warningStyle } from "./theme.js";
import { sanitizeBoardForTerminal } from "./sanitize.js";

export { wrapText } from "./text.js";

export type RenderOptions = {
  chalk: ChalkInstance;
  chars: CharSet;
  width: number;
  compact: boolean;
  /** Show every alternate pin function, in addition to always-visible notes. */
  details?: boolean;
};

const INDENT = "  ";

function renderWidth(opts: RenderOptions): number {
  return normalizeWidth(opts.width);
}

function finish(text: string, opts: RenderOptions): string {
  return opts.chars === asciiChars ? toAscii(text) : text;
}

/** Label plus its primary alternate function and safety-note markers. */
function displayLabel(pin: Pin, ch: CharSet): string {
  const fn = pin.functions?.[0];
  const base = fn && fn !== pin.label ? `${pin.label} / ${fn}` : pin.label;
  const reserved = pin.category === "reserved" ? " *" : "";
  const noted = pin.notes?.length ? ` ${ch.note ?? "^"}` : "";
  return `${base}${reserved}${noted}`;
}

function pinDetails(pin: Pin): string {
  return pin.voltage ? `${pin.category}, ${pin.voltage}` : pin.category;
}

function byPosition(header: Header, column: number, row: number): Pin | undefined {
  return header.pins.find((pin) => pin.position.column === column && pin.position.row === row);
}

/** Bordered two-column diagram: label | pin | pin | label. */
function renderDualRowTable(header: Header, opts: RenderOptions): string[] | undefined {
  const { chalk: c, chars: ch } = opts;
  const rows: Array<[Pin | undefined, Pin | undefined]> = [];
  for (let row = 1; row <= header.layout.rows; row += 1) {
    rows.push([byPosition(header, 1, row), byPosition(header, 2, row)]);
  }

  const leftWidth = Math.max(
    ...rows.map(([left]) => (left ? visibleWidth(displayLabel(left, ch)) : 0)),
    4,
  );
  const rightWidth = Math.max(
    ...rows.map(([, right]) => (right ? visibleWidth(displayLabel(right, ch)) : 0)),
    4,
  );
  const numWidth = Math.max(...header.pins.map((pin) => String(pin.physical).length), 2);
  const horizontal = ch.horizontal;
  const segment = (width: number) => horizontal.repeat(width + 2);
  const top = `${INDENT}${ch.topLeft}${segment(leftWidth)}${ch.topJoin}${segment(numWidth)}${ch.topJoin}${segment(numWidth)}${ch.topJoin}${segment(rightWidth)}${ch.topRight}`;
  if (visibleWidth(top) > renderWidth(opts)) return undefined;

  const lines = [top];
  for (const [left, right] of rows) {
    const leftLabel = left
      ? pinStyle(c, left)(padEndVisible(displayLabel(left, ch), leftWidth))
      : " ".repeat(leftWidth);
    const rightLabel = right
      ? pinStyle(c, right)(padEndVisible(displayLabel(right, ch), rightWidth))
      : " ".repeat(rightWidth);
    const leftNum = left ? String(left.physical).padStart(numWidth) : " ".repeat(numWidth);
    const rightNum = right ? String(right.physical).padStart(numWidth) : " ".repeat(numWidth);
    lines.push(
      `${INDENT}${ch.vertical} ${leftLabel} ${ch.vertical} ${leftNum} ${ch.vertical} ${rightNum} ${ch.vertical} ${rightLabel} ${ch.vertical}`,
    );
  }
  lines.push(
    `${INDENT}${ch.bottomLeft}${segment(leftWidth)}${ch.bottomJoin}${segment(numWidth)}${ch.bottomJoin}${segment(numWidth)}${ch.bottomJoin}${segment(rightWidth)}${ch.bottomRight}`,
  );
  return lines;
}

/** Borderless two-column pairs for --compact / narrower terminals. */
function renderDualRowCompact(header: Header, opts: RenderOptions): string[] | undefined {
  const { chalk: c, chars: ch } = opts;
  const rows: Array<[Pin | undefined, Pin | undefined]> = [];
  for (let row = 1; row <= header.layout.rows; row += 1) {
    rows.push([byPosition(header, 1, row), byPosition(header, 2, row)]);
  }

  const leftWidth = Math.max(
    ...rows.map(([left]) => (left ? visibleWidth(displayLabel(left, ch)) : 0)),
    4,
  );
  const rightWidth = Math.max(
    ...rows.map(([, right]) => (right ? visibleWidth(displayLabel(right, ch)) : 0)),
    4,
  );
  const numWidth = Math.max(...header.pins.map((pin) => String(pin.physical).length), 2);
  const widest = `${INDENT}${" ".repeat(leftWidth)}  ${" ".repeat(numWidth)} ${ch.pairSeparator} ${" ".repeat(numWidth)}  ${" ".repeat(rightWidth)}`;
  if (visibleWidth(widest) > renderWidth(opts)) return undefined;

  return rows.map(([left, right]) => {
    const leftLabel = left
      ? pinStyle(c, left)(padStartVisible(displayLabel(left, ch), leftWidth))
      : " ".repeat(leftWidth);
    const rightLabel = right ? pinStyle(c, right)(displayLabel(right, ch)) : "";
    const leftNum = left ? String(left.physical).padStart(numWidth) : " ".repeat(numWidth);
    const rightNum = right ? String(right.physical).padEnd(numWidth) : " ".repeat(numWidth);
    return `${INDENT}${leftLabel}  ${leftNum} ${ch.pairSeparator} ${rightNum}  ${rightLabel}`.trimEnd();
  });
}

/** One pin per line, wrapping label and details independently when necessary. */
function renderPinList(header: Header, opts: RenderOptions): string[] {
  const { chalk: c, chars: ch } = opts;
  const width = renderWidth(opts);
  const pins = [...header.pins].sort((left, right) => left.physical - right.physical);
  const numWidth = Math.max(...pins.map((pin) => String(pin.physical).length), 2);
  const labelWidth = Math.max(...pins.map((pin) => visibleWidth(displayLabel(pin, ch))), 4);
  const detailWidth = Math.max(...pins.map((pin) => visibleWidth(pinDetails(pin))), 4);
  const alignedWidth = visibleWidth(INDENT) + numWidth + 2 + labelWidth + 2 + detailWidth;

  return pins.flatMap((pin) => {
    const number = String(pin.physical).padStart(numWidth);
    const label = displayLabel(pin, ch);
    const details = pinDetails(pin);

    if (alignedWidth <= width) {
      return [
        `${INDENT}${number}  ${pinStyle(c, pin)(padEndVisible(label, labelWidth))}  ${c.dim(details)}`,
      ];
    }

    const singleLine = `${INDENT}${number}  ${label}  ${details}`;
    if (visibleWidth(singleLine) <= width) {
      return [`${INDENT}${number}  ${pinStyle(c, pin)(label)}  ${c.dim(details)}`];
    }

    const prefix = `${INDENT}${number}  `;
    const continuation = " ".repeat(visibleWidth(prefix));
    const labelLines = wrapText(label, width, prefix, continuation).map((line) => pinStyle(c, pin)(line));
    const detailLines = wrapText(details, width, continuation, continuation).map((line) => c.dim(line));
    return [...labelLines, ...detailLines];
  });
}

/** Bordered single-column table: # | pin | details. */
function renderSingleColumnTable(header: Header, opts: RenderOptions): string[] | undefined {
  const { chalk: c, chars: ch } = opts;
  const pins = [...header.pins].sort((left, right) => left.physical - right.physical);
  const numWidth = Math.max(...pins.map((pin) => String(pin.physical).length), 2);
  const labelWidth = Math.max(...pins.map((pin) => visibleWidth(displayLabel(pin, ch))), 4);
  const detailWidth = Math.max(...pins.map((pin) => visibleWidth(pinDetails(pin))), 4);
  const horizontal = ch.horizontal;
  const segment = (width: number) => horizontal.repeat(width + 2);
  const top = `${INDENT}${ch.topLeft}${segment(numWidth)}${ch.topJoin}${segment(labelWidth)}${ch.topJoin}${segment(detailWidth)}${ch.topRight}`;
  if (visibleWidth(top) > renderWidth(opts)) return undefined;

  const lines = [top];
  for (const pin of pins) {
    const label = pinStyle(c, pin)(padEndVisible(displayLabel(pin, ch), labelWidth));
    lines.push(
      `${INDENT}${ch.vertical} ${String(pin.physical).padStart(numWidth)} ${ch.vertical} ${label} ${ch.vertical} ${padEndVisible(pinDetails(pin), detailWidth)} ${ch.vertical}`,
    );
  }
  lines.push(
    `${INDENT}${ch.bottomLeft}${segment(numWidth)}${ch.bottomJoin}${segment(labelWidth)}${ch.bottomJoin}${segment(detailWidth)}${ch.bottomRight}`,
  );
  return lines;
}

function renderPinAnnotations(header: Header, opts: RenderOptions): string[] {
  const { chalk: c, chars: ch } = opts;
  const width = renderWidth(opts);
  const pins = [...header.pins].sort((left, right) => left.physical - right.physical);
  const annotated = pins.filter(
    (pin) => Boolean(pin.notes?.length) || (Boolean(opts.details) && (pin.functions?.length ?? 0) > 1),
  );
  const lines: string[] = [];

  if (annotated.length > 0) {
    lines.push(c.bold("Pin notes"));
    for (const pin of annotated) {
      const details: string[] = [];
      if (opts.details && (pin.functions?.length ?? 0) > 1) {
        details.push(`additional functions: ${pin.functions!.slice(1).join(", ")}`);
      }
      details.push(...(pin.notes ?? []));
      const prefix = `${INDENT}${ch.note ?? "^"} Pin ${pin.physical}: `;
      const continuation = " ".repeat(visibleWidth(prefix));
      lines.push(...wrapText(details.join("; "), width, prefix, continuation));
    }
  }

  if (!opts.details) {
    const hiddenAlternates = pins.filter((pin) => (pin.functions?.length ?? 0) > 1).length;
    if (hiddenAlternates > 0) {
      if (lines.length > 0) lines.push("");
      lines.push(
        ...wrapText(
          `${ch.info} ${hiddenAlternates} pin${hiddenAlternates === 1 ? " has" : "s have"} additional alternate functions; use --details to show them.`,
          width,
          INDENT,
          `${INDENT}  `,
        ).map((line) => c.dim(line)),
      );
    }
  }

  return lines;
}

function renderHeader(header: Header, opts: RenderOptions): string[] {
  const { chalk: c } = opts;
  const width = renderWidth(opts);
  const lines = wrapText(header.name, width).map((line) => c.bold(line));
  if (header.description) {
    lines.push(...wrapText(header.description, width, INDENT).map((line) => c.dim(line)));
  }

  let table: string[];
  if (header.layout.columns === 2) {
    table = opts.compact
      ? (renderDualRowCompact(header, opts) ?? renderPinList(header, opts))
      : (renderDualRowTable(header, opts) ??
        renderDualRowCompact(header, opts) ??
        renderPinList(header, opts));
  } else {
    table = opts.compact
      ? renderPinList(header, opts)
      : (renderSingleColumnTable(header, opts) ?? renderPinList(header, opts));
  }
  lines.push(...table);

  const annotations = renderPinAnnotations(header, opts);
  if (annotations.length > 0) lines.push("", ...annotations);
  return lines;
}

function renderLegend(board: Board, opts: RenderOptions): string[] {
  const { chalk: c, chars: ch } = opts;
  const order: Pin["category"][] = [
    "power",
    "ground",
    "gpio",
    "digital",
    "analog",
    "communication",
    "special",
    "reserved",
    "nc",
  ];
  const present = order.filter((category) =>
    board.headers.some((header) => header.pins.some((pin) => pin.category === category)),
  );
  if (present.length === 0) return [];

  const swatches = present.map((category) => {
    const sample = board.headers
      .flatMap((header) => header.pins)
      .find((pin) => pin.category === category)!;
    return c.level === 0 ? category : pinStyle(c, sample)(category);
  });
  return wrapText(
    `Legend: ${swatches.join(` ${ch.itemSeparator ?? "|"} `)}`,
    renderWidth(opts),
  ).map((line) => c.dim(line));
}

function warningMarker(ch: CharSet, severity: WarningSeverity): string {
  switch (severity) {
    case "danger":
      return ch.danger ?? ch.warn;
    case "warning":
      return ch.warn;
    case "info":
      return ch.info;
  }
}

export function renderWarnings(board: Board, opts: RenderOptions): string[] {
  const { chalk: c, chars: ch } = opts;
  return board.warnings.flatMap((warning) => {
    const marker = warningMarker(ch, warning.severity);
    const style = warningStyle(c, warning.severity);
    return wrapText(`${marker} ${warning.text}`, renderWidth(opts), "", INDENT).map((line) => style(line));
  });
}

function primarySourceFor(board: Board) {
  const typeScore = {
    Pinout: 2000,
    Schematic: 800,
    Datasheet: 70,
    Manual: 60,
    Docs: 50,
  } as const;
  const score = (source: (typeof board.sources)[number]): number => {
    const searchable = `${source.title} ${source.url}`;
    const connectorSpecific = /pinout|gpio|connector|header/i.test(searchable);
    return (
      (source.official ? 1000 : 0) +
      (connectorSpecific ? 200 : 0) +
      (source.type ? typeScore[source.type] : 0)
    );
  };
  return board.sources.reduce<(typeof board.sources)[number] | undefined>(
    (best, source) => {
      if (!best) return source;
      return score(source) > score(best) ? source : best;
    },
    undefined,
  );
}

export function renderBoard(board: Board, opts: RenderOptions): string {
  board = sanitizeBoardForTerminal(board);
  const { chalk: c, chars: ch } = opts;
  const width = renderWidth(opts);
  const lines: string[] = [];

  lines.push(
    ...wrapText(`${board.name} ${ch.dash ?? "-"} ${board.manufacturer}`, width).map((line) =>
      c.bold(line),
    ),
  );
  const primarySource = primarySourceFor(board);
  if (primarySource) {
    const tag = primarySource.official ? "official" : "third-party";
    lines.push(
      ...wrapText(
        `Source: ${primarySource.title} (${tag}) ${ch.dash ?? "-"} see ph ${board.id} --source`,
        width,
        "",
        INDENT,
      ).map((line) => c.dim(line)),
    );
  }
  if (board.revisionNote) {
    lines.push(
      ...wrapText(`${ch.info} ${board.revisionNote}`, width, "", INDENT).map((line) => c.dim(line)),
    );
  }
  lines.push(...renderWarnings(board, opts));
  lines.push("");

  if (board.headers.length === 0) {
    lines.push(
      ...wrapText(
        `No pinout data for this board yet ${ch.dash ?? "-"} see ph ${board.id} --source for documentation.`,
        width,
      ).map((line) => c.dim(line)),
    );
  }
  board.headers.forEach((header, index) => {
    if (index > 0) lines.push("");
    lines.push(...renderHeader(header, opts));
  });

  const legend = renderLegend(board, opts);
  if (legend.length > 0) lines.push("", ...legend);
  const hasReserved = board.headers.some((header) =>
    header.pins.some((pin) => pin.category === "reserved"),
  );
  if (hasReserved) {
    lines.push(
      ...wrapText(`* reserved / control pin ${ch.dash ?? "-"} see warnings above`, width).map(
        (line) => c.dim(line),
      ),
    );
  }
  const hasNotes = board.headers.some((header) => header.pins.some((pin) => pin.notes?.length));
  if (hasNotes) {
    lines.push(...wrapText(`${ch.note ?? "^"} pin-specific note`, width).map((line) => c.dim(line)));
  }
  return finish(lines.join("\n"), opts);
}
