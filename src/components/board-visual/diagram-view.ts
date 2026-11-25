import type { Rect } from "@/lib/board-visual-geometry";

/**
 * Pan and zoom for a connector diagram, in sheet units. `zoom` 1 shows the
 * whole sheet; the centre moves only as far as keeps the view on the sheet.
 */
export type DiagramView = { zoom: number; cx: number; cy: number };
export type Size = { w: number; h: number };

export const FIT: DiagramView = { zoom: 1, cx: Number.NaN, cy: Number.NaN };

/** The whole sheet, padded to the box's aspect so nothing is distorted. */
export function fitRect(sheet: Size, box: Size): Rect {
  if (box.w <= 0 || box.h <= 0) return { x: 0, y: 0, w: sheet.w, h: sheet.h };
  const scale = Math.min(box.w / sheet.w, box.h / sheet.h);
  const w = box.w / scale;
  const h = box.h / scale;
  return { x: (sheet.w - w) / 2, y: (sheet.h - h) / 2, w, h };
}

export function clampView(view: DiagramView, sheet: Size, box: Size, maxZoom: number): DiagramView {
  const fit = fitRect(sheet, box);
  const zoom = Math.min(Math.max(view.zoom, 1), Math.max(maxZoom, 1));
  const w = fit.w / zoom;
  const h = fit.h / zoom;
  const centre = (value: number, start: number, span: number, size: number) =>
    Number.isFinite(value) ? Math.min(Math.max(value, start + size / 2), start + span - size / 2) : start + span / 2;
  return { zoom, cx: centre(view.cx, fit.x, fit.w, w), cy: centre(view.cy, fit.y, fit.h, h) };
}

export function viewRect(view: DiagramView, sheet: Size, box: Size): Rect {
  const fit = fitRect(sheet, box);
  const w = fit.w / view.zoom;
  const h = fit.h / view.zoom;
  const cx = Number.isFinite(view.cx) ? view.cx : fit.x + fit.w / 2;
  const cy = Number.isFinite(view.cy) ? view.cy : fit.y + fit.h / 2;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** Zoom by `factor`, keeping the sheet point under (px, py) in the box still. */
export function zoomAt(
  view: DiagramView, factor: number, px: number, py: number, sheet: Size, box: Size, maxZoom: number,
): DiagramView {
  const before = viewRect(view, sheet, box);
  const fx = box.w > 0 ? px / box.w : 0.5;
  const fy = box.h > 0 ? py / box.h : 0.5;
  const anchorX = before.x + fx * before.w;
  const anchorY = before.y + fy * before.h;
  const zoom = Math.min(Math.max(view.zoom * factor, 1), Math.max(maxZoom, 1));
  const fit = fitRect(sheet, box);
  const w = fit.w / zoom;
  const h = fit.h / zoom;
  return clampView({ zoom, cx: anchorX - fx * w + w / 2, cy: anchorY - fy * h + h / 2 }, sheet, box, maxZoom);
}

/** Move the view by a drag of (dx, dy) screen pixels. */
export function panBy(view: DiagramView, dx: number, dy: number, sheet: Size, box: Size, maxZoom: number): DiagramView {
  const rect = viewRect(view, sheet, box);
  const scale = box.w > 0 ? rect.w / box.w : 1;
  return clampView({ zoom: view.zoom, cx: rect.x + rect.w / 2 - dx * scale, cy: rect.y + rect.h / 2 - dy * scale }, sheet, box, maxZoom);
}

/** Centre on a point that lies outside the view (with a margin); otherwise leave the view alone. */
export function reveal(
  view: DiagramView, x: number, y: number, margin: number, sheet: Size, box: Size, maxZoom: number,
): DiagramView {
  const rect = viewRect(view, sheet, box);
  const inside = x - margin >= rect.x && x + margin <= rect.x + rect.w && y - margin >= rect.y && y + margin <= rect.y + rect.h;
  return inside ? view : clampView({ zoom: view.zoom, cx: x, cy: y }, sheet, box, maxZoom);
}

/** Normalise a wheel event's vertical delta to pixels. */
export function wheelPixels(deltaY: number, deltaMode: number, pageHeight: number): number {
  return deltaMode === 1 ? deltaY * 16 : deltaMode === 2 ? deltaY * pageHeight : deltaY;
}
