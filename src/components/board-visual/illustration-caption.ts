import type { BoardGeometry } from "@/lib/board-visual-geometry";

/**
 * The honesty line under every board drawing: what is source-backed (the
 * pins) and what is illustration (outline, family features, generic parts).
 */
export function illustrationCaption(geometry: BoardGeometry): string {
  const base = geometry.notToScale
    ? "Simplified diagram, grouped by function — not to physical scale. Pin data is source-backed; verify against the linked documentation."
    : geometry.familyArt
      ? `${geometry.familyArt.name} family illustration: modules, buttons and parts are representative, not this model's exact layout. Pin data is source-backed; verify against the linked documentation before wiring.`
      : "Simplified technical illustration. Pin data is source-backed; verify against the linked documentation before wiring.";
  return geometry.orderNote ? `${base} ${geometry.orderNote}` : base;
}
