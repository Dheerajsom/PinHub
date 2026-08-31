import type { Board } from "../model.js";
import { safeTerminalValue } from "./text.js";

/** Generous ceiling for real hardware headers, while bounding forged layouts. */
export const MAX_RENDER_HEADER_ROWS = 512;

function optionalValue(value: string | undefined): string | undefined {
  return value === undefined ? undefined : safeTerminalValue(value);
}

function assertPositiveSafeInteger(value: number, path: string, maximum: number): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new RangeError(`${path} must be a positive safe integer no greater than ${maximum}.`);
  }
}

/**
 * Guard the numeric layout fields that drive renderer loops and allocation.
 * TypeScript types do not protect the public API from decoded or plain JS data.
 */
function validateBoardStructure(board: Board): void {
  for (const [headerIndex, header] of board.headers.entries()) {
    const headerPath = `board.headers[${headerIndex}]`;
    assertPositiveSafeInteger(
      header.layout.rows,
      `${headerPath}.layout.rows`,
      MAX_RENDER_HEADER_ROWS,
    );
    if (header.layout.columns !== 1 && header.layout.columns !== 2) {
      throw new RangeError(`${headerPath}.layout.columns must be 1 or 2.`);
    }
    if (header.pins.length > header.layout.rows * header.layout.columns) {
      throw new RangeError(`${headerPath}.pins exceeds the declared layout capacity.`);
    }

    const physicalPins = new Set<number>();
    const occupiedCells = new Set<string>();
    for (const [pinIndex, pin] of header.pins.entries()) {
      const pinPath = `${headerPath}.pins[${pinIndex}]`;
      assertPositiveSafeInteger(pin.physical, `${pinPath}.physical`, Number.MAX_SAFE_INTEGER);
      assertPositiveSafeInteger(pin.position.row, `${pinPath}.position.row`, header.layout.rows);
      assertPositiveSafeInteger(
        pin.position.column,
        `${pinPath}.position.column`,
        header.layout.columns,
      );
      if (physicalPins.has(pin.physical)) {
        throw new RangeError(`${headerPath}.pins contains a duplicate physical pin number.`);
      }
      const cell = `${pin.position.row},${pin.position.column}`;
      if (occupiedCells.has(cell)) {
        throw new RangeError(`${headerPath}.pins contains a duplicate grid position.`);
      }
      physicalPins.add(pin.physical);
      occupiedCells.add(cell);
    }
  }
}

/**
 * Clone externally supplied board data at the terminal boundary, removing
 * escape/control characters and embedded line breaks before layout or styling.
 * `renderBoard` is a public library API, so callers are not limited to the
 * source-controlled catalog bundled with the CLI.
 */
export function sanitizeBoardForTerminal(board: Board): Board {
  validateBoardStructure(board);
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
