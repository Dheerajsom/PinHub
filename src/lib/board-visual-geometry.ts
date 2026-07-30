// Geometry engine: turns a board's source-backed `pinout` plus its visual
// template (board-visuals.ts) into concrete coordinates for the drawing and an
// anchor per electrical pin. No pin labels live here — pins are read straight
// from the board data, so this file never becomes a second source of truth.
//
// The drawing is a fabrication drawing, not a picture of a board, and that
// constrains what this file is allowed to emit. Only three things about a board
// are actually known: the connector rows and their pin data (source-backed),
// the board's rough proportions, and which edge the USB port is on (both
// curated per form factor). Component positions, port positions, and mounting
// hole positions are not known for any board in the catalog, so no coordinates
// are produced for them — a drawing that invents where the regulator sits
// teaches the reader to distrust the pins too.

import type { Board, Pin } from "@/lib/boards";
import {
  accentForBoard,
  boardVisuals,
  type BoardVisual,
  type PortKind,
} from "@/lib/board-visuals";

export type Side = "left" | "right" | "top" | "bottom";

export type PinAnchor = {
  /** Stable, globally-unique key — grouped pinouts reuse pin positions, so we
   *  key on the connector row + index, never on position alone. */
  key: string;
  pin: Pin;
  group?: string;
  cx: number;
  cy: number;
  side: Side;
  /** Rail point just outside the board edge where an expanded label sits. */
  labelX: number;
  labelY: number;
  /**
   * Where the label sits relative to its rail point. Rotated labels are all
   * drawn with the same -90° rotation so the whole sheet reads bottom-to-top
   * (tilt your head once, not twice), which means the anchor is what steers a
   * label away from the board: "start" grows up out of the rail point, "end"
   * grows down from it. Getting this wrong runs the label back across the pads.
   */
  labelAnchor: "start" | "middle" | "end";
  /** Render the label rotated (dense top/bottom headers). */
  rotateLabel: boolean;
};

export type Rect = { x: number; y: number; w: number; h: number; rx?: number };
export type PortMark = Rect & { kind: PortKind; side: Side };

export type BoardGeometry = {
  kind: BoardVisual["headerKind"];
  vbw: number;
  vbh: number;
  body: Rect;
  accent: string;
  headerZones: Rect[];
  /** The curated USB edge marker — the sheet's orientation datum. */
  ports: PortMark[];
  anchors: PinAnchor[];
  padR: number;
  /** Drawn centre-to-centre pin spacing; sets the step of the sheet grid. */
  pitch: number;
  /** How the pins are arranged, for the title block — e.g. "2 × 20". */
  arrangement: string;
  /**
   * The body's bottom edge is a break line: the board continues past the
   * drawing, which is cropped to the connector.
   */
  cropBottom?: boolean;
  notToScale: boolean;
  orientation: string;
  revisionNote?: string;
};

// --- tunable layout constants (all in viewBox units) -----------------------
const PAD_R = 13;
const EDGE_PITCH = 46; // edge-dual / shield row spacing
const COL_PITCH = 44; // header2x column spacing
const SIDE_MARGIN = 28;
const MIN_LABEL_SIDE = 175; // edge-dual side rails
const MIN_LABEL_BAND = 120; // rotated top/bottom rails

// Advance width of one label character at the drawing's label size. Label rails
// are sized from the longest label they have to hold rather than a fixed band,
// so a board with long signal names gets the room instead of clipping.
const LABEL_CHAR_W = 10.4;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function longestLabel(pins: Pin[]): number {
  return pins.reduce((n, pin) => Math.max(n, pin.label.length), 0);
}

/** Rail depth needed to hold the longest label in `pins`, within bounds. */
function railFor(pins: Pin[], min: number, max = 460): number {
  return clamp(longestLabel(pins) * LABEL_CHAR_W + 34, min, max);
}

function clampPitch(pitch: number, count: number, max: number): number {
  // Keep very dense headers from exploding the viewBox.
  if (count <= 1) return pitch;
  const total = (count - 1) * pitch;
  if (total <= max) return pitch;
  return max / (count - 1);
}

/** Resolve the two edge rows for an edge-dual board (from pins or groups). */
function edgeRows(board: Board, visual: BoardVisual): { left: Pin[]; right: Pin[] } {
  const p = board.pinout;
  if (visual.source === "groups" && p?.groups && p.groups.length >= 2) {
    return { left: p.groups[0].pins, right: p.groups[1].pins };
  }
  return { left: p?.pins?.left ?? [], right: p?.pins?.right ?? [] };
}

function buildEdgeDual(board: Board, visual: BoardVisual): Omit<BoardGeometry, "kind"> {
  const { left, right } = edgeRows(board, visual);
  const n = Math.max(left.length, right.length, 1);
  const pitch = EDGE_PITCH;
  const headerLen = (n - 1) * pitch;
  const padPad = 70;
  const bodyH = headerLen + padPad * 2;
  const bodyW = Math.max(bodyH * visual.aspect, 220);

  const leftRail = railFor(left, MIN_LABEL_SIDE);
  const rightRail = railFor(right, MIN_LABEL_SIDE);

  const topMargin = 60;
  const bottomMargin = 60;
  const vbw = leftRail + bodyW + rightRail;
  const vbh = topMargin + bodyH + bottomMargin;

  const bodyX = leftRail;
  const bodyY = topMargin;
  const body: Rect = { x: bodyX, y: bodyY, w: bodyW, h: bodyH, rx: 22 };

  const edgeInset = 30;
  const leftX = bodyX + edgeInset;
  const rightX = bodyX + bodyW - edgeInset;
  const startY = bodyY + padPad;

  const anchors: PinAnchor[] = [];
  left.forEach((pin, i) => {
    const cy = startY + i * pitch;
    anchors.push({
      key: `pL:${i}`,
      pin,
      cx: leftX,
      cy,
      side: "left",
      labelX: bodyX - 18,
      labelY: cy,
      labelAnchor: "end",
      rotateLabel: false,
    });
  });
  right.forEach((pin, i) => {
    const cy = startY + i * pitch;
    anchors.push({
      key: `pR:${i}`,
      pin,
      cx: rightX,
      cy,
      side: "right",
      labelX: bodyX + bodyW + 18,
      labelY: cy,
      labelAnchor: "start",
      rotateLabel: false,
    });
  });

  // Each strip is drawn to its own row's length. Sizing both to the longer row
  // would draw contacts that are not there — on a 7+7 module that is a lie the
  // reader could act on.
  const strip = (count: number, x: number): Rect => ({
    x: x - PAD_R - 6,
    y: startY - PAD_R - 6,
    w: (PAD_R + 6) * 2,
    h: Math.max(count - 1, 0) * pitch + (PAD_R + 6) * 2,
    rx: 8,
  });
  const headerZones: Rect[] = [
    strip(left.length, leftX),
    strip(right.length, rightX),
  ].filter((zone) => zone.h > 0);

  return {
    vbw,
    vbh,
    body,
    accent: accentForBoard(board.id, board.vendor),
    headerZones,
    ports: usbMark(visual, body),
    anchors,
    padR: PAD_R,
    pitch,
    arrangement: `2 × ${n}`,
    notToScale: Boolean(visual.notToScale),
    orientation: visual.orientation,
    revisionNote: visual.revisionNote,
  };
}

// A 2xN header is drawn as a *detail view*: the sheet is cropped to the strip of
// board the connector sits on, with a break line where the board continues.
// Drawing the whole outline would mean putting the header somewhere on it, and
// where the header sits on the board is not something the catalog knows — the
// old full-board version left the connector as a sliver in a large empty
// rectangle and had nowhere to put the even-row labels except back across the
// pads.
function buildHeader2x(board: Board, visual: BoardVisual): Omit<BoardGeometry, "kind"> {
  const p = board.pinout;
  const odd = p?.pins?.left ?? []; // odd positions, 1 3 5 …
  const even = p?.pins?.right ?? []; // even positions, 2 4 6 …
  const n = Math.max(odd.length, even.length, 1);
  const pitch = clampPitch(COL_PITCH, n, 1100);
  const headerLen = (n - 1) * pitch;
  const hpad = 78;
  const bodyW = headerLen + hpad * 2;

  const topRail = railFor(odd, MIN_LABEL_BAND);
  const bottomRail = railFor(even, MIN_LABEL_BAND);

  const rowGap = 46;
  const edgeToRow = 44; // board top edge down to the odd row
  const rowToCrop = 44; // even row down to the break line
  const bodyH = edgeToRow + rowGap + rowToCrop;

  const vbw = SIDE_MARGIN + bodyW + SIDE_MARGIN;
  const vbh = topRail + bodyH + bottomRail;

  const bodyX = SIDE_MARGIN;
  const bodyY = topRail;
  const body: Rect = { x: bodyX, y: bodyY, w: bodyW, h: bodyH, rx: 18 };

  const startX = bodyX + hpad;
  const oddRowY = bodyY + edgeToRow;
  const evenRowY = oddRowY + rowGap;

  const anchors: PinAnchor[] = [];
  odd.forEach((pin, i) => {
    const cx = startX + i * pitch;
    anchors.push({
      key: `pL:${i}`,
      pin,
      cx,
      cy: oddRowY,
      side: "top",
      labelX: cx,
      labelY: bodyY - 20,
      labelAnchor: "start", // grows up, out of the sheet's top rail
      rotateLabel: true,
    });
  });
  even.forEach((pin, i) => {
    const cx = startX + i * pitch;
    anchors.push({
      key: `pR:${i}`,
      pin,
      cx,
      cy: evenRowY,
      side: "bottom",
      labelX: cx,
      labelY: bodyY + bodyH + 20,
      labelAnchor: "end", // grows down, away from the pads
      rotateLabel: true,
    });
  });

  const headerZones: Rect[] = [
    {
      x: startX - PAD_R - 8,
      y: oddRowY - PAD_R - 8,
      w: headerLen + (PAD_R + 8) * 2,
      h: rowGap + (PAD_R + 8) * 2,
      rx: 8,
    },
  ];

  return {
    vbw,
    vbh,
    body,
    accent: accentForBoard(board.id, board.vendor),
    headerZones,
    ports: [],
    anchors,
    padR: PAD_R,
    pitch,
    arrangement: `2 × ${n}`,
    cropBottom: true,
    notToScale: Boolean(visual.notToScale),
    orientation: visual.orientation,
    revisionNote: visual.revisionNote,
  };
}

function buildShieldSplit(board: Board, visual: BoardVisual): Omit<BoardGeometry, "kind"> {
  const p = board.pinout;
  const groups = p?.groups ?? [];
  // shield-split is only assigned to 2-group boards. If a board with 3+ groups
  // were ever pointed here, the extra groups' pins would be unanchored and the
  // validation gate's anchor-count check would fail the build (by design).
  const topRow = groups[0]?.pins ?? [];
  const bottomRow = groups[1]?.pins ?? [];
  const topLabel = groups[0]?.label ?? "Header A";
  const bottomLabel = groups[1]?.label ?? "Header B";
  const n = Math.max(topRow.length, bottomRow.length, 1);
  const pitch = clampPitch(EDGE_PITCH, n, 1500);
  const headerLen = (n - 1) * pitch;
  const hpad = 80;
  const bodyW = headerLen + hpad * 2;
  // Capped: at the board's true proportions a long shield leaves a large empty
  // field between the two header rows, and there is nothing truthful to put in
  // it. The outline is declared representative, so it is drawn compactly.
  const bodyH = clamp(bodyW / visual.aspect, 380, 520);

  const topRail = railFor(topRow, MIN_LABEL_BAND);
  const bottomRail = railFor(bottomRow, MIN_LABEL_BAND);
  const vbw = SIDE_MARGIN + bodyW + SIDE_MARGIN;
  const vbh = topRail + bodyH + bottomRail;

  const bodyX = SIDE_MARGIN;
  const bodyY = topRail;
  const body: Rect = { x: bodyX, y: bodyY, w: bodyW, h: bodyH, rx: 16 };

  const startX = bodyX + hpad;
  const topRowY = bodyY + 54;
  const bottomRowY = bodyY + bodyH - 54;

  const anchors: PinAnchor[] = [];
  topRow.forEach((pin, i) => {
    const cx = startX + i * pitch;
    anchors.push({
      key: `g0:${i}`,
      pin,
      group: topLabel,
      cx,
      cy: topRowY,
      side: "top",
      labelX: cx,
      labelY: bodyY - 20,
      labelAnchor: "start",
      rotateLabel: true,
    });
  });
  bottomRow.forEach((pin, i) => {
    const cx = startX + i * pitch;
    anchors.push({
      key: `g1:${i}`,
      pin,
      group: bottomLabel,
      cx,
      cy: bottomRowY,
      side: "bottom",
      labelX: cx,
      labelY: bodyY + bodyH + 20,
      labelAnchor: "end",
      rotateLabel: true,
    });
  });

  // Per-row widths: the two shield headers rarely hold the same number of pins,
  // and a footprint drawn to the longer row would show contacts that are not
  // on the board.
  const shieldRow = (count: number, y: number): Rect => ({
    x: startX - PAD_R - 6,
    y: y - PAD_R - 6,
    w: Math.max(count - 1, 0) * pitch + (PAD_R + 6) * 2,
    h: (PAD_R + 6) * 2,
    rx: 6,
  });
  const headerZones: Rect[] = [
    shieldRow(topRow.length, topRowY),
    shieldRow(bottomRow.length, bottomRowY),
  ];

  return {
    vbw,
    vbh,
    body,
    accent: accentForBoard(board.id, board.vendor),
    headerZones,
    ports: usbMark(visual, body),
    anchors,
    padR: PAD_R,
    pitch,
    arrangement: `${topRow.length} + ${bottomRow.length}`,
    notToScale: Boolean(visual.notToScale),
    orientation: visual.orientation,
    revisionNote: visual.revisionNote,
  };
}

function buildEdgeConnector(board: Board, visual: BoardVisual): Omit<BoardGeometry, "kind"> {
  const p = board.pinout;
  const flat: { pin: Pin; group: string }[] = [];
  for (const group of p?.groups ?? []) {
    for (const pin of group.pins) flat.push({ pin, group: group.label });
  }
  const n = Math.max(flat.length, 1);
  const pitch = clampPitch(40, n, 1200);
  const headerLen = (n - 1) * pitch;
  const hpad = 60;
  const bodyW = headerLen + hpad * 2;
  // Capped for the same reason as shield-split: only the bottom edge carries
  // contacts, so the board's full height would be mostly empty field.
  const bodyH = clamp(bodyW / visual.aspect, 300, 430);

  const bottomRail = railFor(
    flat.map((entry) => entry.pin),
    MIN_LABEL_BAND,
  );
  const topMargin = 44;
  const vbw = SIDE_MARGIN + bodyW + SIDE_MARGIN;
  const vbh = topMargin + bodyH + bottomRail;

  const bodyX = SIDE_MARGIN;
  const bodyY = topMargin;
  const body: Rect = { x: bodyX, y: bodyY, w: bodyW, h: bodyH, rx: 18 };

  const startX = bodyX + hpad;
  // The contact row sits on the board's bottom edge — these are edge fingers,
  // so the pads straddle the outline rather than sitting inside it.
  const rowY = bodyY + bodyH - 26;

  const anchors: PinAnchor[] = flat.map((entry, i) => {
    const cx = startX + i * pitch;
    return {
      key: `e:${i}`,
      pin: entry.pin,
      group: entry.group,
      cx,
      cy: rowY,
      side: "bottom",
      labelX: cx,
      labelY: bodyY + bodyH + 20,
      labelAnchor: "end",
      rotateLabel: true,
    };
  });

  const headerZones: Rect[] = [
    { x: startX - PAD_R - 6, y: rowY - PAD_R - 10, w: headerLen + (PAD_R + 6) * 2, h: (PAD_R + 10) * 2, rx: 4 },
  ];

  return {
    vbw,
    vbh,
    body,
    accent: accentForBoard(board.id, board.vendor),
    headerZones,
    ports: usbMark(visual, body),
    anchors,
    padR: PAD_R,
    pitch,
    arrangement: `1 × ${n}`,
    notToScale: Boolean(visual.notToScale),
    orientation: visual.orientation,
    revisionNote: visual.revisionNote,
  };
}

// Function-grouped boards have no resolvable physical coordinates, so their
// sheet is openly schematic: one labelled strip per function block. Column
// spacing follows the longest signal name in the board so every pad can carry
// its label on the drawing — a field of numbered dots you have to hover to
// identify is not a pin map.
function buildGroupStrips(board: Board, visual: BoardVisual): Omit<BoardGeometry, "kind"> {
  const p = board.pinout;
  const groups = p?.groups ?? [];
  const allPins = groups.flatMap((group) => group.pins);

  // Labels are split on "/" and stacked, so a column only has to be as wide as
  // the longest *segment* ("18 / A4" needs room for "18", not for both).
  const longestSegment = allPins.reduce((n, pin) => {
    for (const segment of pin.label.split("/")) {
      n = Math.max(n, segment.trim().length);
    }
    return n;
  }, 0);
  const colPitch = clamp(longestSegment * 8.6 + 26, 78, 190);
  const perRow = clamp(Math.round(880 / colPitch), 5, 11);
  const rowPitch = 96; // pad + up to two stacked label lines
  const stripGap = 30;
  const stripTitleH = 36;

  const contentW = perRow * colPitch;
  const vbw = SIDE_MARGIN * 2 + contentW;
  const bodyX = SIDE_MARGIN;

  let cursorY = 30;
  const anchors: PinAnchor[] = [];
  const headerZones: Rect[] = [];

  groups.forEach((group, gi) => {
    cursorY += stripTitleH;
    const rows = Math.ceil(group.pins.length / perRow);
    const zoneTop = cursorY - stripTitleH + 8;
    group.pins.forEach((pin, i) => {
      const r = Math.floor(i / perRow);
      const c = i % perRow;
      const cx = bodyX + colPitch / 2 + c * colPitch;
      const cy = cursorY + r * rowPitch + 18;
      anchors.push({
        key: `g${gi}:${i}`,
        pin,
        group: group.label,
        cx,
        cy,
        side: "bottom",
        labelX: cx,
        labelY: cy + PAD_R + 16,
        labelAnchor: "middle",
        rotateLabel: false,
      });
    });
    const zoneBottom = cursorY + (rows - 1) * rowPitch + 18 + rowPitch * 0.72;
    // Each block is only as wide as it needs to be. A four-pin power block
    // framed across eleven columns reads as seven missing pins.
    const occupied = Math.min(group.pins.length, perRow);
    headerZones.push({
      x: bodyX,
      y: zoneTop,
      w: occupied * colPitch,
      h: zoneBottom - zoneTop,
      rx: 10,
    });
    cursorY = zoneBottom + stripGap;
  });

  const vbh = cursorY + 10;
  // No board outline: this sheet makes no claim about the board's shape. The
  // body is recorded as the full sheet so downstream code has a sane frame.
  const body: Rect = { x: bodyX, y: 0, w: contentW, h: vbh, rx: 0 };

  return {
    vbw,
    vbh,
    body,
    accent: accentForBoard(board.id, board.vendor),
    headerZones,
    ports: [],
    anchors,
    padR: PAD_R,
    pitch: colPitch,
    arrangement: `${groups.length} function blocks`,
    notToScale: true,
    orientation: visual.orientation,
    revisionNote: visual.revisionNote,
  };
}

// --- orientation datum -----------------------------------------------------

// A single marker on the curated USB edge. This is the one non-pin mark on the
// sheet, and it earns its place: "which end is the USB?" is how a reader lines
// the drawing up with the board in their hand.
function usbMark(visual: BoardVisual, body: Rect): PortMark[] {
  const edge = visual.usb ?? "none";
  if (edge === "none") return [];
  const kind: PortKind = visual.ports?.[0] ?? "usb-micro";
  const across = Math.min(Math.max(body.w, body.h) * 0.22, 130);
  const depth = 26;

  if (edge === "top") {
    return [
      { kind, side: "top", x: body.x + body.w / 2 - across / 2, y: body.y - depth / 2, w: across, h: depth, rx: 5 },
    ];
  }
  if (edge === "bottom") {
    return [
      { kind, side: "bottom", x: body.x + body.w / 2 - across / 2, y: body.y + body.h - depth / 2, w: across, h: depth, rx: 5 },
    ];
  }
  if (edge === "left") {
    return [
      { kind, side: "left", x: body.x - depth / 2, y: body.y + body.h / 2 - across / 2, w: depth, h: across, rx: 5 },
    ];
  }
  return [
    { kind, side: "right", x: body.x + body.w - depth / 2, y: body.y + body.h / 2 - across / 2, w: depth, h: across, rx: 5 },
  ];
}

const builders: Record<
  BoardVisual["headerKind"],
  (board: Board, visual: BoardVisual) => Omit<BoardGeometry, "kind">
> = {
  header2x: buildHeader2x,
  "edge-dual": buildEdgeDual,
  "shield-split": buildShieldSplit,
  "edge-connector": buildEdgeConnector,
  "group-strips": buildGroupStrips,
};

/** Build the full geometry for a board, or null if it has no pinout. */
export function buildBoardGeometry(board: Board): BoardGeometry | null {
  if (!board.pinout) return null;
  const visual = boardVisuals[board.id];
  if (!visual) return null;
  return { kind: visual.headerKind, ...builders[visual.headerKind](board, visual) };
}
