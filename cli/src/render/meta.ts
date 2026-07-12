import type { Board, WarningSeverity } from "../model.js";
import type { RenderOptions } from "./board.js";
import { asciiChars, type CharSet } from "./chars.js";
import {
  normalizeWidth,
  padEndVisible,
  padStartVisible,
  toAscii,
  visibleWidth,
  wrapText,
} from "./text.js";
import { warningStyle } from "./theme.js";

type BoardRow = {
  id: string;
  name: string;
  manufacturer: string;
  pins: string;
};

function finish(text: string, opts: RenderOptions): string {
  return opts.chars === asciiChars ? toAscii(text) : text;
}

function warningMarker(chars: CharSet, severity: WarningSeverity): string {
  switch (severity) {
    case "danger":
      return chars.danger ?? chars.warn;
    case "warning":
      return chars.warn;
    case "info":
      return chars.info;
  }
}

function renderCardList(rows: BoardRow[], opts: RenderOptions): string[] {
  const { chalk: c, chars: ch } = opts;
  const width = normalizeWidth(opts.width);
  const lines: string[] = [];
  for (const row of rows) {
    lines.push(...wrapText(`${row.id} (${row.pins} pins)`, width).map((line) => c.bold(line)));
    if (!opts.compact) {
      lines.push(
        ...wrapText(`${row.name} ${ch.dash ?? "-"} ${row.manufacturer}`, width, "  ").map((line) =>
          c.dim(line),
        ),
      );
    }
  }
  return lines;
}

/** Width-responsive catalog/search table; cells wrap instead of being truncated. */
export function renderBoardTable(boardList: Board[], opts: RenderOptions): string {
  const { chalk: c } = opts;
  const width = normalizeWidth(opts.width);
  const rows: BoardRow[] = boardList.map((board) => ({
    id: board.id,
    name: board.name,
    manufacturer: board.manufacturer,
    pins: String(board.headers.reduce((sum, header) => sum + header.pins.length, 0)),
  }));
  const lines: string[] = [c.bold(`${rows.length} board${rows.length === 1 ? "" : "s"}`)];

  if (rows.length === 0) return finish(lines.join("\n"), opts);

  const pinWidth = Math.max(4, ...rows.map((row) => visibleWidth(row.pins)));
  const availableForText = width - pinWidth - 6;
  if (opts.compact || availableForText < 36) {
    lines.push(...renderCardList(rows, opts));
  } else {
    const idWidth = Math.max(14, Math.floor(availableForText * 0.4));
    const nameWidth = Math.max(12, Math.floor(availableForText * 0.34));
    const manufacturerWidth = availableForText - idWidth - nameWidth;

    lines.push(
      c.dim(
        `${padEndVisible("ID", idWidth)}  ${padEndVisible("BOARD", nameWidth)}  ${padEndVisible("MANUFACTURER", manufacturerWidth)}  ${padStartVisible("PINS", pinWidth)}`,
      ),
    );

    for (const row of rows) {
      const idLines = wrapText(row.id, idWidth);
      const nameLines = wrapText(row.name, nameWidth);
      const manufacturerLines = wrapText(row.manufacturer, manufacturerWidth);
      const height = Math.max(idLines.length, nameLines.length, manufacturerLines.length);
      for (let index = 0; index < height; index += 1) {
        const id = padEndVisible(idLines[index] ?? "", idWidth);
        const name = padEndVisible(nameLines[index] ?? "", nameWidth);
        const manufacturer = padEndVisible(manufacturerLines[index] ?? "", manufacturerWidth);
        const pins = index === 0 ? padStartVisible(row.pins, pinWidth) : " ".repeat(pinWidth);
        lines.push(`${c.bold(id)}  ${name}  ${manufacturer}  ${pins}`.trimEnd());
      }
    }
  }

  lines.push("");
  lines.push(
    ...wrapText("Show a pinout with: ph <id>   e.g. ph rpi5", width).map((line) => c.dim(line)),
  );
  return finish(lines.join("\n"), opts);
}

export function renderSources(board: Board, opts: RenderOptions): string {
  const { chalk: c, chars: ch } = opts;
  const width = normalizeWidth(opts.width);
  const lines = wrapText(`${board.name} ${ch.dash ?? "-"} sources`, width).map((line) => c.bold(line));

  for (const source of board.sources) {
    const tag = source.official ? "official" : "third-party";
    const style = source.official ? c.green : c.yellow;
    lines.push(
      ...wrapText(`${ch.bullet} ${source.title} (${tag})`, width, "  ", "    ").map((line) => style(line)),
    );
    lines.push(...wrapText(source.url, width, "    ", "    ").map((line) => c.dim(line)));
  }
  return finish(lines.join("\n"), opts);
}

export function renderInfo(board: Board, opts: RenderOptions): string {
  const { chalk: c, chars: ch } = opts;
  const width = normalizeWidth(opts.width);
  const lines: string[] = [];
  lines.push(
    ...wrapText(`${board.name} ${ch.dash ?? "-"} ${board.manufacturer}`, width).map((line) =>
      c.bold(line),
    ),
  );
  if (board.description) lines.push(...wrapText(board.description, width));
  if (board.revisionNote) {
    lines.push("");
    lines.push(...wrapText(`Revision note: ${board.revisionNote}`, width).map((line) => c.dim(line)));
  }

  lines.push("", c.bold("Headers"));
  for (const header of board.headers) {
    lines.push(
      ...wrapText(
        `${ch.bullet} ${header.name} ${ch.dash ?? "-"} ${header.pins.length} pins`,
        width,
        "  ",
        "    ",
      ),
    );
  }
  if (board.headers.length === 0) {
    lines.push(...wrapText("No pinout headers available yet.", width, "  ").map((line) => c.dim(line)));
  }

  lines.push("", c.bold("Warnings"));
  for (const warning of board.warnings) {
    const marker = warningMarker(ch, warning.severity);
    const style = warningStyle(c, warning.severity);
    lines.push(
      ...wrapText(`${marker} ${warning.text}`, width, "  ", "    ").map((line) => style(line)),
    );
  }

  lines.push("", c.bold("Sources"));
  for (const source of board.sources) {
    const tag = source.official ? "official" : "third-party";
    const style = source.official ? c.green : c.yellow;
    lines.push(
      ...wrapText(`${ch.bullet} ${source.title} (${tag})`, width, "  ", "    ").map((line) => style(line)),
    );
    lines.push(...wrapText(source.url, width, "    ", "    ").map((line) => c.dim(line)));
  }

  if (opts.details) {
    lines.push("", c.bold("Pin details"));
    let detailCount = 0;
    for (const header of board.headers) {
      const pins = [...header.pins]
        .sort((left, right) => left.physical - right.physical)
        .filter((pin) => Boolean(pin.functions?.length || pin.notes?.length));
      if (pins.length === 0) continue;
      lines.push(...wrapText(header.name, width, "  ").map((line) => c.bold(line)));
      for (const pin of pins) {
        const detail: string[] = [];
        if (pin.functions?.length) detail.push(`functions: ${pin.functions.join(", ")}`);
        if (pin.notes?.length) detail.push(...pin.notes);
        const prefix = `    Pin ${pin.physical}: `;
        const continuation = " ".repeat(visibleWidth(prefix));
        lines.push(...wrapText(detail.join("; "), width, prefix, continuation));
        detailCount += 1;
      }
    }
    if (detailCount === 0) {
      lines.push(...wrapText("No additional pin details.", width, "  ").map((line) => c.dim(line)));
    }
  }

  lines.push("");
  lines.push(...wrapText(`Aliases: ${board.aliases.join(", ") || "none"}`, width).map((line) => c.dim(line)));
  lines.push(...wrapText(`Pinout: ph ${board.id}`, width).map((line) => c.dim(line)));
  return finish(lines.join("\n"), opts);
}
