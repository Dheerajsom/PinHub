/**
 * Cells of a two-column connector list, kept in their physical rows: the
 * left header in column 0 and the right header in column 1, row by row. A
 * side that is longer than the other keeps every pin; its extra pins sit in
 * their own column with an empty cell opposite, never shifted into the other
 * header's column.
 */
export type ConnectorCell<T> = { item: T; row: number; col: 0 | 1 };

export function connectorCells<T>(left: readonly T[], right: readonly T[]): ConnectorCell<T>[] {
  const cells: ConnectorCell<T>[] = [];
  for (let row = 0; row < Math.max(left.length, right.length); row += 1) {
    if (row < left.length) cells.push({ item: left[row], row, col: 0 });
    if (row < right.length) cells.push({ item: right[row], row, col: 1 });
  }
  return cells;
}

const moves: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

/**
 * The cell index a key moves to, or null for keys the grid does not handle.
 * Arrows follow the physical rows and columns and stop at the edges (no
 * wrapping into the other header); a step onto an empty cell stays put.
 * Home and End go to the first and last pin.
 */
export function connectorKeyTarget(
  cells: readonly Pick<ConnectorCell<unknown>, "row" | "col">[],
  index: number,
  key: string,
): number | null {
  if (!cells.length) return null;
  if (key === "Home") return 0;
  if (key === "End") return cells.length - 1;
  const move = moves[key];
  if (!move) return null;
  const from = cells[index];
  if (!from) return null;
  const target = cells.findIndex(
    (cell) => cell.row === from.row + move[0] && cell.col === from.col + move[1],
  );
  return target === -1 ? index : target;
}
