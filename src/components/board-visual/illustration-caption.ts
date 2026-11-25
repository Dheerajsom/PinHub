import type { BoardGeometry } from "@/lib/board-visual-geometry";

/** Clarify the relationship between the drawing, the pin order and the board revision. */
export function connectorCaption(geometry: BoardGeometry): string {
  if (geometry.artworkId) return geometry.revisionNote ?? geometry.orientation;
  if (geometry.portraitId && geometry.kind === "header2x") {
    return geometry.revisionNote ?? "Look for the pin 1 marking on the board.";
  }
  const layout = geometry.kind === "group-strips" ? "Signals are grouped by connector or function."
    : geometry.portraitId ? "Illustrated component side." : "Connector reference.";
  return [layout, geometry.orderNote, geometry.revisionNote].filter(Boolean).join(" ");
}
