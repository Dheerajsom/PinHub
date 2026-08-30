import type { Board } from "../model.js";
import { safeTerminalValue } from "./text.js";

function optionalValue(value: string | undefined): string | undefined {
  return value === undefined ? undefined : safeTerminalValue(value);
}

/**
 * Clone externally supplied board data at the terminal boundary, removing
 * escape/control characters and embedded line breaks before layout or styling.
 * `renderBoard` is a public library API, so callers are not limited to the
 * source-controlled catalog bundled with the CLI.
 */
export function sanitizeBoardForTerminal(board: Board): Board {
  return {
    ...board,
    id: safeTerminalValue(board.id),
    name: safeTerminalValue(board.name),
    manufacturer: safeTerminalValue(board.manufacturer),
    aliases: board.aliases.map(safeTerminalValue),
    description: optionalValue(board.description),
    revisionNote: optionalValue(board.revisionNote),
    warnings: board.warnings.map((warning) => ({
      ...warning,
      text: safeTerminalValue(warning.text),
    })),
    sources: board.sources.map((source) => ({
      ...source,
      title: safeTerminalValue(source.title),
      url: safeTerminalValue(source.url),
    })),
    headers: board.headers.map((header) => ({
      ...header,
      id: safeTerminalValue(header.id),
      name: safeTerminalValue(header.name),
      description: optionalValue(header.description),
      layout: { ...header.layout },
      pins: header.pins.map((pin) => ({
        ...pin,
        position: { ...pin.position },
        label: safeTerminalValue(pin.label),
        gpio: optionalValue(pin.gpio),
        functions: pin.functions?.map(safeTerminalValue),
        voltage: optionalValue(pin.voltage),
        notes: pin.notes?.map(safeTerminalValue),
      })),
    })),
  };
}
