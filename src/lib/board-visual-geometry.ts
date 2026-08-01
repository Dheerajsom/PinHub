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
export type Hole = { x: number; y: number; r: number };

export type BoardGeometry = {
  kind: BoardVisual["headerKind"];
  vbw: number;
  vbh: number;
  body: Rect;
  accent: string;
  headerZones: Rect[];
  /** Curated connectors, placed on the edges the visual template records. */
  ports: PortMark[];
  /** Mounting holes, drawn as plated corner holes on boards that have them. */
  holes: Hole[];
  anchors: PinAnchor[];
  padR: number;
  /** Drawn centre-to-centre pin spacing; sets the step of the header. */
  pitch: number;
  /** How the pins are arranged — e.g. "2 × 20". */
  arrangement: string;
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
    // Both long edges are castellated pads on these modules, so every curated
    // connector lives on the end the template records.
    ports: boardPorts(visual, body, visual.usb === "bottom" ? "bottom" : "top"),
    holes: [],
    anchors,
    padR: PAD_R,
    pitch,
    arrangement: `2 × ${n}`,
    notToScale: Boolean(visual.notToScale),
    orientation: visual.orientation,
    revisionNote: visual.revisionNote,
  };
}

// A 2xN header board is drawn as the whole board: the outline in its curated
// proportions, the connector inset from the top edge where these boards carry
// it, and the labels taken out to rails clear of the outline — the odd row up
// out of the top edge, the even row down past the bottom of the board, so no
// signal name is ever drawn back across a pad it does not belong to.
function buildHeader2x(board: Board, visual: BoardVisual): Omit<BoardGeometry, "kind"> {
  const p = board.pinout;
  const odd = p?.pins?.left ?? []; // odd positions, 1 3 5 …
  const even = p?.pins?.right ?? []; // even positions, 2 4 6 …
  const n = Math.max(odd.length, even.length, 1);
  const pitch = clampPitch(COL_PITCH, n, 1100);
  const headerLen = (n - 1) * pitch;
  const hpad = 78;
  const bodyW = headerLen + hpad * 2;

  // A little more room than the text strictly needs, so a name never reads as
  // if it were about to run off the sheet.
  const topRail = railFor(odd, MIN_LABEL_BAND) + 12;
  const bottomRail = railFor(even, MIN_LABEL_BAND) + 12;

  const rowGap = 46;
  const edgeToRow = 52; // board top edge down to the odd row
  // The board's own proportions, floored so the connector never fills the
  // outline it is supposed to sit on.
  const bodyH = clamp(bodyW / visual.aspect, edgeToRow + rowGap + 150, 900);

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
    ports: boardPorts(visual, body, "bottom"),
    holes: corners(body, 30),
    anchors,
    padR: PAD_R,
    pitch,
    arrangement: `2 × ${n}`,
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
    // Shield headers run the length of both long edges, so the connectors go
    // on an end — which is where the Arduino-footprint boards carry them.
    ports: boardPorts(visual, body, "left"),
    holes: corners(body, 28),
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
    // The bottom edge is the gold connector itself, so anything else the
    // template records goes on the top edge.
    ports: boardPorts(visual, body, "top"),
    holes: [],
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
    holes: [],
    anchors,
    padR: PAD_R,
    pitch: colPitch,
    arrangement: `${groups.length} function blocks`,
    notToScale: true,
    orientation: visual.orientation,
    revisionNote: visual.revisionNote,
  };
}

// --- connectors and mounting holes -----------------------------------------

// Relative size of each connector, as a fraction of the edge it sits on. These
// are the proportions that make a connector recognizable at a glance — an
// Ethernet jack is the widest thing on an SBC, a JST battery lead is a nub —
// which is the whole job of drawing them: orienting the reader, not specifying
// the board.
const portSpan: Record<PortKind, number> = {
  ethernet: 0.155,
  "usb-a": 0.135,
  hdmi: 0.11,
  "usb-c": 0.085,
  "usb-mini": 0.085,
  "usb-micro": 0.075,
  barrel: 0.075,
  jst: 0.06,
  camera: 0.055,
  audio: 0.05,
};

const portDepth: Record<PortKind, number> = {
  ethernet: 40,
  "usb-a": 36,
  hdmi: 28,
  "usb-c": 22,
  "usb-mini": 24,
  "usb-micro": 22,
  barrel: 30,
  jst: 20,
  camera: 18,
  audio: 24,
};

/** A connector straddling one edge of the board, centred `at` along that edge. */
function edgeMark(kind: PortKind, side: Side, body: Rect, at: number): PortMark {
  const along = side === "left" || side === "right" ? body.h : body.w;
  const across = clamp(along * portSpan[kind], 26, 180);
  const depth = portDepth[kind];

  if (side === "top" || side === "bottom") {
    const y = side === "top" ? body.y - depth * 0.55 : body.y + body.h - depth * 0.45;
    return { kind, side, x: body.x + along * at - across / 2, y, w: across, h: depth, rx: 4 };
  }
  const x = side === "left" ? body.x - depth * 0.55 : body.x + body.w - depth * 0.45;
  return { kind, side, x, y: body.y + along * at - across / 2, w: depth, h: across, rx: 4 };
}

/**
 * Places the curated connectors: the first one on the board's recorded USB
 * edge, the rest spread along `spread` — the edge the header does not occupy.
 * Boards whose template records no ports get none; nothing is invented here.
 */
function boardPorts(
  visual: BoardVisual,
  body: Rect,
  spread: Side,
): PortMark[] {
  const list = visual.ports ?? [];
  if (!list.length) return [];

  const usbEdge = visual.usb ?? "none";
  const marks: PortMark[] = [];
  let rest = list;

  if (usbEdge !== "none") {
    // Down the same edge when the USB shares it with the other connectors.
    const stacked = usbEdge === spread ? list : [list[0]];
    stacked.forEach((kind, index) => {
      marks.push(edgeMark(kind, usbEdge, body, spot(index, stacked.length)));
    });
    rest = usbEdge === spread ? [] : list.slice(1);
  }

  rest.forEach((kind, index) => {
    marks.push(edgeMark(kind, spread, body, spot(index, rest.length)));
  });

  return marks;
}

// Even spacing across the usable middle of an edge, leaving the corners for
// mounting holes.
function spot(index: number, count: number): number {
  if (count <= 1) return 0.5;
  return 0.17 + (index * 0.66) / (count - 1);
}

function corners(body: Rect, inset: number): Hole[] {
  const r = 9;
  return [
    { x: body.x + inset, y: body.y + inset, r },
    { x: body.x + body.w - inset, y: body.y + inset, r },
    { x: body.x + inset, y: body.y + body.h - inset, r },
    { x: body.x + body.w - inset, y: body.y + body.h - inset, r },
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
