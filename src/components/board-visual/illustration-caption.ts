import type { BoardGeometry } from "@/lib/board-visual-geometry";

/** Caption for a product illustration paired with a separate connector sheet. */
export function connectorCaption(geometry: BoardGeometry): string {
  if (geometry.artworkId) return geometry.revisionNote ?? geometry.orientation;
  const layout = geometry.kind === "group-strips" ? "Signals are grouped by connector or function."
    : geometry.kind === "edge-dual" ? "Illustrated component side." : "Connector reference.";
  return [layout, geometry.orderNote, geometry.revisionNote].filter(Boolean).join(" ");
}
