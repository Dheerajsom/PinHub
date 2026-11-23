import type { BoardGeometry, PinAnchor, Rect } from "@/lib/board-visual-geometry";
import type { WireEnd } from "@/lib/board-link";
import { stackedFontSize, stackedLabelExtent, wrapStackedLabel } from "@/components/board-visual/label-layout";

/**
 * The part of a connector sheet a link uses: every connector that carries one
 * of the linked pins, whole, with its labels, and nothing else. Framing the
 * sheet on it means a Nucleo-144's CN7 is on screen at a readable size instead
 * of a quarter of a board you have to scroll across to find.
 *
 * A connector is a pin group. Pins with no group form one connector, which
 * keeps both rows of a 2 × 20 header together: framing one row alone would
 * draw half a header.
 */
export type SheetView = Rect & {
  /** The connectors in the frame, in sheet order, for the caption. */
  connectors: string[];
};

// Room above the pads for a connector's designator, lettered over its strip,
// and a small gutter on the other sides. A wider bottom gutter would pull in
// the designator of the connector stacked below (a Nucleo-144's CN10 under CN7).
const FRAME_TOP = 52;
const FRAME_GUTTER = 20;

// A frame that keeps most of the sheet is not worth the switch: the reader
// would lose the board around the pins for very little extra size.
const MAX_AREA_SHARE = 0.72;

const LOOSE = "\u0000loose";

function connectorOf(anchor: PinAnchor): string {
  return anchor.group ?? LOOSE;
}

/** The box a pad and its label occupy, in viewBox units. */
function anchorBox(geometry: BoardGeometry, anchor: PinAnchor): Rect {
  const r = geometry.padR;
  let x0 = anchor.cx - r;
  let x1 = anchor.cx + r;
  let y0 = anchor.cy - r;
  let y1 = anchor.cy + r;

  if (geometry.kind === "group-strips") {
    // Schematic strips set each label under its pad, wrapped to the column.
    const font = stackedFontSize(geometry.pitch);
    const extent = stackedLabelExtent(wrapStackedLabel(anchor.pin.label, geometry.pitch, font), font);
    x0 = Math.min(x0, anchor.cx - geometry.pitch / 2);
    x1 = Math.max(x1, anchor.cx + geometry.pitch / 2);
    y1 = Math.max(y1, anchor.labelY + extent.height);
  } else if (anchor.rotateLabel) {
    // Rotated labels run out along a rail as deep as the longest label on the
    // sheet, so the frame takes the rail out to the sheet's edge.
    if (anchor.labelAnchor === "start") y0 = 0;
    else y1 = geometry.vbh;
    x0 = Math.min(x0, anchor.labelX - 12);
    x1 = Math.max(x1, anchor.labelX + 12);
  } else {
    // Horizontal labels run out to a side rail sized for the longest label.
    if (anchor.labelAnchor === "end") x0 = 0;
    else if (anchor.labelAnchor === "start") x1 = geometry.vbw;
    else {
      x0 = 0;
      x1 = geometry.vbw;
    }
    y0 = Math.min(y0, anchor.labelY - 14);
    y1 = Math.max(y1, anchor.labelY + 14);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * Frame a sheet on the connectors that carry `keys` (anchor keys; null for a
 * wire end the drawing has no pad for). Returns null when the whole sheet is
 * the better view: nothing linked is drawn, a linked end has no pad, or the
 * frame would keep most of the sheet anyway.
 */
export function linkedSheetView(geometry: BoardGeometry, keys: readonly (string | null)[]): SheetView | null {
  if (!keys.length || keys.some((key) => key === null)) return null;
  const linked = geometry.anchors.filter((anchor) => keys.includes(anchor.key));
  if (!linked.length) return null;

  const wanted = new Set(linked.map(connectorOf));
  const members = geometry.anchors.filter((anchor) => wanted.has(connectorOf(anchor)));

  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const anchor of members) {
    const box = anchorBox(geometry, anchor);
    x0 = Math.min(x0, box.x);
    y0 = Math.min(y0, box.y);
    x1 = Math.max(x1, box.x + box.w);
    y1 = Math.max(y1, box.y + box.h);
  }
  x0 = Math.max(0, x0 - FRAME_GUTTER);
  y0 = Math.max(0, y0 - FRAME_TOP);
  x1 = Math.min(geometry.vbw, x1 + FRAME_GUTTER);
  y1 = Math.min(geometry.vbh, y1 + FRAME_GUTTER);

  const w = x1 - x0;
  const h = y1 - y0;
  if (w <= 0 || h <= 0) return null;
  if (w * h > geometry.vbw * geometry.vbh * MAX_AREA_SHARE) return null;

  const connectors: string[] = [];
  for (const anchor of members) {
    const name = connectorOf(anchor);
    if (name !== LOOSE && !connectors.includes(name)) connectors.push(name);
  }
  return { x: x0, y: y0, w, h, connectors };
}

/** The sheet pad a wire end lands on, or null when the drawing has none. */
export function wireEndKey(geometry: BoardGeometry, end: WireEnd): string | null {
  const anchor =
    geometry.anchors.find((item) => item.pin === end.pin) ??
    geometry.anchors.find((item) => item.group === end.group && item.pin.position === end.pin.position);
  return anchor?.key ?? null;
}

/**
 * Where to centre a scrolling sheet so the reader sees as many linked pads as
 * the panel can hold. `pads` are the pads' x positions in scroll pixels, in
 * wire order; `margin` keeps each pad's ring clear of the panel edge.
 *
 * Centring on the midpoint of all the pads fails once they span more than the
 * panel: on a Grand Central at phone width the midpoint fell between pads and
 * none was on screen. Instead the widest-reaching window wins, and of equal
 * windows the one holding the earliest wire (TX before RX before GND).
 */
export function sheetScrollCentre(
  pads: readonly number[],
  width: number,
  margin: number,
): { centre: number; shown: number } | null {
  if (!pads.length) return null;
  const reach = Math.max(width - margin * 2, 0);
  let best: { members: number[]; first: number } | null = null;
  for (const start of pads) {
    const members = pads.map((x, index) => (x >= start && x <= start + reach ? index : -1)).filter((i) => i !== -1);
    const first = Math.min(...members);
    if (!best || members.length > best.members.length || (members.length === best.members.length && first < best.first)) {
      best = { members, first };
    }
  }
  const xs = best!.members.map((index) => pads[index]);
  return { centre: (Math.min(...xs) + Math.max(...xs)) / 2, shown: xs.length };
}

/** True when a pad's centre lies inside a frame. */
export function inView(view: Rect, anchor: PinAnchor): boolean {
  return anchor.cx >= view.x && anchor.cx <= view.x + view.w && anchor.cy >= view.y && anchor.cy <= view.y + view.h;
}
