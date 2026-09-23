import { boards } from "@/lib/boards";

// Catalog index for scripts and tools: enough to discover board ids and pick
// one, without shipping every pin map. Full records stay at /api/boards/[id].
export type BoardIndexEntry = {
  id: string;
  name: string;
  vendor: string;
  category: string;
  processor: string;
  logicLevel: string;
  interfaces: string[];
  hasPinout: boolean;
  warningCount: number;
  /** Relative URL of the full JSON record. */
  url: string;
};

export function boardIndex(): BoardIndexEntry[] {
  return boards.map((board) => ({
    id: board.id,
    name: board.name,
    vendor: board.vendor,
    category: board.category,
    processor: board.processor,
    logicLevel: board.logicLevel,
    interfaces: [...board.interfaces],
    hasPinout: Boolean(board.pinout),
    warningCount: board.warnings.length,
    url: `/api/boards/${encodeURIComponent(board.id)}`,
  }));
}
