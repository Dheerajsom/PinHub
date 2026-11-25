import type { LookupPin } from "../pin-match.js";
import type { Board } from "../model.js";
import { diagramLocation } from "../lookup-location.js";
import type { RenderOptions } from "./board.js";
import { safeTerminalValue, wrapText, toAscii, normalizeWidth } from "./text.js";
import { asciiChars } from "./chars.js";

export function renderPinLookup(board: Pick<Board, "name" | "headers" | "lookupLocations">, pins: readonly LookupPin[], opts: RenderOptions): string {
  const width = normalizeWidth(opts.width);
  const lines = wrapText(safeTerminalValue(board.name), width).map((line) => opts.chalk.bold(line));
  const named = board.headers.length > 1;
  for (const pin of pins) {
    // Number the pin as `ph <board>` draws it, and name its header when the
    // diagram has several, so the lookup and the diagram never disagree.
    const location = diagramLocation(board, pin);
    const position = location ? location.pin.physical : pin.position;
    const where = location ? (named ? location.header.name : undefined) : pin.group;
    const heading = `Pin ${position}  ${pin.label}  ${pin.role.toUpperCase()}${pin.net ? `  ${pin.net}` : ""}${where ? `  (${where})` : ""}`;
    lines.push(...wrapText(safeTerminalValue(heading), width));
    if (pin.aliases?.length) lines.push(...wrapText(safeTerminalValue(pin.aliases.join(" / ")), width, "  ").map((line) => opts.chalk.dim(line)));
    if (pin.note) lines.push(...wrapText(safeTerminalValue(pin.note), width, "  "));
    if (pin.flags?.length) lines.push(...wrapText(safeTerminalValue(`Flags: ${pin.flags.join(", ")}`), width, "  "));
  }
  const output = lines.join("\n");
  return opts.chars === asciiChars ? toAscii(output) : output;
}
