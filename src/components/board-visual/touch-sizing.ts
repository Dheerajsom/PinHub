import type { BoardGeometry } from "@/lib/board-visual-geometry";

/** Keep hit regions inside the pin pitch; grow the sheet instead of overlapping pins. */
export function padHitRadius(geometry: BoardGeometry): number {
  return Math.min(geometry.pitch * 0.48, geometry.padR + 9);
}

export function touchDrawingWidth(geometry: BoardGeometry, compact = false): number {
  const width = compact ? geometry.body.w + 48 : geometry.vbw;
  return Math.ceil((width * 44) / (2 * padHitRadius(geometry)));
}
