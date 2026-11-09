// What kind of drawing each catalog board gets in the Dynamic view. Derived
// from the same geometry and family layout the renderer uses, so the inventory
// in docs/DESIGN.md and the audit cannot drift from what is actually drawn.
//
// - dedicated: model-specific illustrated artwork (Raspberry Pi models).
// - family:    physical outline plus family features (module can, buttons,
//              debugger section, LED matrix, SoC, heatsink) from curated
//              template metadata. Representative, not a model layout.
// - generic:   physical outline with the generic rule-placed parts only.
// - schematic: function-grouped connector strips, not to physical scale.
// - unmapped:  no source-backed pin map yet, so no drawing.

import type { Board } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { freeField, layoutFamilyArt } from "@/lib/board-family-art";

export type RenderTier = "dedicated" | "family" | "generic" | "schematic" | "unmapped";
export const renderTiers: RenderTier[] = ["dedicated", "family", "generic", "schematic", "unmapped"];

export function renderTier(board: Board): RenderTier {
  const geometry = buildBoardGeometry(board);
  if (!geometry) return "unmapped";
  if (geometry.artworkId) return "dedicated";
  if (geometry.kind === "group-strips") return "schematic";
  if (geometry.familyArt) {
    const layout = layoutFamilyArt(
      geometry.familyArt,
      freeField(geometry.body, geometry.headerZones, geometry.ports),
      geometry.usbEdge,
    );
    if (layout?.features.length) return "family";
  }
  // The Nucleo-144 builder letters its ST-LINK section delimiter itself.
  if (geometry.silk?.lines.length) return "family";
  return "generic";
}

export function renderCoverage(boards: Board[]): Record<RenderTier, string[]> {
  const coverage = Object.fromEntries(renderTiers.map((tier) => [tier, [] as string[]])) as Record<RenderTier, string[]>;
  for (const board of boards) coverage[renderTier(board)].push(board.id);
  return coverage;
}
