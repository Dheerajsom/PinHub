// The board portrait and the electrical map have independent coverage.
import type { Board } from "@/lib/boards";
import { boardPortrait } from "@/lib/board-portraits";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";

export type RenderTier = "pi" | "module" | "header" | "separate" | "portraitOnly" | "missing";

export function renderTier(board: Board): RenderTier {
  const geometry = buildBoardGeometry(board);
  if (geometry?.artworkId) return "pi";
  if (!boardPortrait(board.id)) return "missing";
  if (!geometry) return "portraitOnly";
  if (geometry.portraitId) return geometry.kind === "edge-dual" ? "module" : "header";
  return "separate";
}

export function renderCoverage(boards: Board[]): Record<RenderTier, string[]> {
  const coverage: Record<RenderTier, string[]> = { pi: [], module: [], header: [], separate: [], portraitOnly: [], missing: [] };
  for (const board of boards) coverage[renderTier(board)].push(board.id);
  return coverage;
}
