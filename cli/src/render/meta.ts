import type { ChalkInstance } from "chalk";
import type { Board } from "../model.js";
import type { CharSet } from "./chars.js";
import { warningStyle } from "./theme.js";
import { wrapText } from "./board.js";

export function renderBoardTable(boardList: Board[], c: ChalkInstance): string {
  const rows = boardList.map((board) => ({
    id: board.id,
    name: board.name,
    manufacturer: board.manufacturer,
    pins: String(board.headers.reduce((sum, h) => sum + h.pins.length, 0)),
  }));
  const idWidth = Math.max(...rows.map((r) => r.id.length), 2);
  const nameWidth = Math.max(...rows.map((r) => r.name.length), 5);
  const mfrWidth = Math.max(...rows.map((r) => r.manufacturer.length), 12);
  const lines = [
    c.dim(
      `${"ID".padEnd(idWidth)}  ${"BOARD".padEnd(nameWidth)}  ${"MANUFACTURER".padEnd(mfrWidth)}  PINS`,
    ),
    ...rows.map(
      (r) =>
        `${c.bold(r.id.padEnd(idWidth))}  ${r.name.padEnd(nameWidth)}  ${r.manufacturer.padEnd(mfrWidth)}  ${r.pins.padStart(4)}`,
    ),
  ];
  lines.push("");
  lines.push(c.dim("Show a pinout with: ph <id>   e.g. ph rpi5"));
  return lines.join("\n");
}

export function renderSources(board: Board, c: ChalkInstance): string {
  const lines = [`${c.bold(board.name)} ${c.dim("— sources")}`];
  for (const source of board.sources) {
    const tag = source.official ? c.green("(official)") : c.yellow("(third-party)");
    lines.push(`  ${source.title} ${tag}`);
    lines.push(c.dim(`    ${source.url}`));
  }
  return lines.join("\n");
}

export function renderInfo(board: Board, c: ChalkInstance, ch: CharSet, width: number): string {
  const lines: string[] = [];
  lines.push(`${c.bold(board.name)} ${c.dim(`— ${board.manufacturer}`)}`);
  if (board.description) lines.push(...wrapText(board.description, width, ""));
  if (board.revisionNote) {
    lines.push("");
    lines.push(...wrapText(`Revision note: ${board.revisionNote}`, width, "").map((l) => c.dim(l)));
  }
  lines.push("");
  lines.push(c.bold("Headers"));
  for (const header of board.headers) {
    lines.push(`  ${ch.bullet} ${header.name} — ${header.pins.length} pins`);
  }
  lines.push("");
  lines.push(c.bold("Warnings"));
  for (const warning of board.warnings) {
    const marker = warning.severity === "info" ? ch.info : ch.warn;
    const style = warningStyle(c, warning.severity);
    lines.push(
      ...wrapText(`${marker} ${warning.text}`, width, "  ").map((l) => style(l)),
    );
  }
  lines.push("");
  lines.push(c.bold("Sources"));
  for (const source of board.sources) {
    const tag = source.official ? c.green("(official)") : c.yellow("(third-party)");
    lines.push(`  ${ch.bullet} ${source.title} ${tag}`);
    lines.push(c.dim(`    ${source.url}`));
  }
  lines.push("");
  lines.push(c.dim(`Aliases: ${board.aliases.join(", ")}`));
  lines.push(c.dim(`Pinout: ph ${board.id}`));
  return lines.join("\n");
}
