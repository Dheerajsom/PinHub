import type { LookupPin } from "../pin-match.js";
import type { RenderOptions } from "./board.js";
import { safeTerminalValue, wrapText, toAscii, normalizeWidth } from "./text.js";
import { asciiChars } from "./chars.js";

export function renderPinLookup(name: string, pins: readonly LookupPin[], opts: RenderOptions): string {
  const width = normalizeWidth(opts.width);
  const lines = wrapText(safeTerminalValue(name), width).map((line) => opts.chalk.bold(line));
  for (const pin of pins) {
    const heading = `Pin ${pin.position}  ${pin.label}  ${pin.role.toUpperCase()}${pin.net ? `  ${pin.net}` : ""}${pin.group ? `  (${pin.group})` : ""}`;
    lines.push(...wrapText(safeTerminalValue(heading), width));
    if (pin.aliases?.length) lines.push(...wrapText(safeTerminalValue(pin.aliases.join(" / ")), width, "  ").map((line) => opts.chalk.dim(line)));
    if (pin.note) lines.push(...wrapText(safeTerminalValue(pin.note), width, "  "));
    if (pin.flags?.length) lines.push(...wrapText(safeTerminalValue(`Flags: ${pin.flags.join(", ")}`), width, "  "));
  }
  const output = lines.join("\n");
  return opts.chars === asciiChars ? toAscii(output) : output;
}
