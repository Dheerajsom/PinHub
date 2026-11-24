import type { BoardGeometry } from "@/lib/board-visual-geometry";

/** Keep hit regions inside the pin pitch; grow the sheet instead of overlapping pins. */
export function padHitRadius(geometry: BoardGeometry): number {
  return Math.min(geometry.pitch * 0.48, geometry.padR + 9);
}

export function touchDrawingWidth(geometry: BoardGeometry): number {
  // Leave a pixel on the sheet for the browser's fractional SVG scaling.
  return Math.ceil((geometry.vbw * 44) / (2 * padHitRadius(geometry))) + 1;
}
