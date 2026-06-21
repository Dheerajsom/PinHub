// Geometry engine: turns a board's source-backed `pinout` plus its visual
// template (board-visuals.ts) into concrete coordinates for the artwork and an
// anchor per electrical pin. No pin labels live here — pins are read straight
// from the board data, so this file never becomes a second source of truth.

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
  labelAnchor: "start" | "middle" | "end";
  /** Render the label rotated (dense top/bottom headers). */
  rotateLabel: boolean;
};

export type Rect = { x: number; y: number; w: number; h: number; rx?: number };
export type PortMark = Rect & { kind: PortKind };
export type Hole = { x: number; y: number; r: number };

export type BoardGeometry = {
  kind: BoardVisual["headerKind"];
  vbw: number;
  vbh: number;
  body: Rect;
  accent: string;
  headerZones: Rect[];
  ports: PortMark[];
  chip?: Rect;
  holes: Hole[];
  anchors: PinAnchor[];
  padR: number;
  notToScale: boolean;
  orientation: string;
  revisionNote?: string;
};

// --- tunable layout constants (all in viewBox units) -----------------------
const PAD_R = 13;
const EDGE_PITCH = 46; // edge-dual / shield row spacing
const COL_PITCH = 44; // header2x column spacing
const LABEL_SIDE = 250; // room reserved for side labels (expanded)
const LABEL_BAND = 220; // room reserved for top/bottom rotated labels
const SIDE_MARGIN = 28;

function clampPitch(pitch: number, count: number, max: number): number {
  // Keep very dense headers from exploding the viewBox.
  if (count <= 1) return pitch;
  const total = (count - 1) * pitch;
  if (total <= max) return pitch;
  return max / (count - 1);
}

function pins(board: Board) {
  return board.pinout;
}

/** Resolve the two edge rows for an edge-dual board (from pins or groups). */
function edgeRows(board: Board, visual: BoardVisual): { left: Pin[]; right: Pin[] } {
  const p = pins(board);
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

  const topMargin = 60;
  const bottomMargin = 60;
  const vbw = LABEL_SIDE + bodyW + LABEL_SIDE;
  const vbh = topMargin + bodyH + bottomMargin;

  const bodyX = LABEL_SIDE;
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
      labelX: bodyX - 16,
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
      labelX: bodyX + bodyW + 16,
      labelY: cy,
      labelAnchor: "start",
      rotateLabel: false,
    });
  });

  const headerZones: Rect[] = [
    { x: leftX - PAD_R - 6, y: startY - PAD_R - 6, w: (PAD_R + 6) * 2, h: headerLen + (PAD_R + 6) * 2, rx: 8 },
    { x: rightX - PAD_R - 6, y: startY - PAD_R - 6, w: (PAD_R + 6) * 2, h: headerLen + (PAD_R + 6) * 2, rx: 8 },
  ];

  return {
    vbw,
    vbh,
    body,
    accent: accentForBoard(board.id, board.vendor),
    headerZones,
    ports: edgePorts(visual, body),
    chip: { x: bodyX + bodyW * 0.32, y: bodyY + bodyH * 0.4, w: bodyW * 0.36, h: bodyH * 0.18, rx: 6 },
    holes: [],
    anchors,
    padR: PAD_R,
    notToScale: Boolean(visual.notToScale),
    orientation: visual.orientation,
    revisionNote: visual.revisionNote,
  };
}

function buildHeader2x(board: Board, visual: BoardVisual): Omit<BoardGeometry, "kind"> {
  const p = pins(board);
  const top = p?.pins?.left ?? []; // odd positions
  const bottom = p?.pins?.right ?? []; // even positions
  const n = Math.max(top.length, bottom.length, 1);
  const pitch = clampPitch(COL_PITCH, n, 1100);
  const headerLen = (n - 1) * pitch;
  const hpad = 80;
  const bodyW = headerLen + hpad * 2;
  const bodyH = Math.max(bodyW / visual.aspect, 360);

  const topMargin = LABEL_BAND;
  const vbw = SIDE_MARGIN + bodyW + SIDE_MARGIN;
  const vbh = topMargin + bodyH + 20;

  const bodyX = SIDE_MARGIN;
  const bodyY = topMargin;
  const body: Rect = { x: bodyX, y: bodyY, w: bodyW, h: bodyH, rx: 18 };

  const startX = bodyX + hpad;
  const topRowY = bodyY + 64;
  const rowGap = 46;
  const bottomRowY = topRowY + rowGap;

  const anchors: PinAnchor[] = [];
  top.forEach((pin, i) => {
    const cx = startX + i * pitch;
    anchors.push({
      key: `pL:${i}`,
      pin,
      cx,
      cy: topRowY,
      side: "top",
      labelX: cx,
      labelY: bodyY - 16,
      labelAnchor: "start",
      rotateLabel: true,
    });
  });
  bottom.forEach((pin, i) => {
    const cx = startX + i * pitch;
    anchors.push({
      key: `pR:${i}`,
      pin,
      cx,
      cy: bottomRowY,
      side: "bottom",
      labelX: cx,
      labelY: bottomRowY + 30,
      labelAnchor: "start",
      rotateLabel: true,
    });
  });

  const headerZones: Rect[] = [
    {
      x: startX - PAD_R - 8,
      y: topRowY - PAD_R - 8,
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
    ports: sbcPorts(visual, body),
    chip: { x: bodyX + bodyW * 0.34, y: bodyY + bodyH * 0.52, w: bodyW * 0.3, h: bodyH * 0.26, rx: 8 },
    holes: corners(body, 26),
    anchors,
    padR: PAD_R,
    notToScale: Boolean(visual.notToScale),
    orientation: visual.orientation,
    revisionNote: visual.revisionNote,
  };
}

function buildShieldSplit(board: Board, visual: BoardVisual): Omit<BoardGeometry, "kind"> {
  const p = pins(board);
  const groups = p?.groups ?? [];
  const topRow = groups[0]?.pins ?? [];
  const bottomRow = groups[1]?.pins ?? [];
  const topLabel = groups[0]?.label ?? "Header A";
  const bottomLabel = groups[1]?.label ?? "Header B";
  const n = Math.max(topRow.length, bottomRow.length, 1);
  const pitch = clampPitch(EDGE_PITCH, n, 1500);
  const headerLen = (n - 1) * pitch;
  const hpad = 80;
  const bodyW = headerLen + hpad * 2;
  const bodyH = Math.max(bodyW / visual.aspect, 380);

  const topMargin = LABEL_BAND;
  const bottomMargin = LABEL_BAND;
  const vbw = SIDE_MARGIN + bodyW + SIDE_MARGIN;
  const vbh = topMargin + bodyH + bottomMargin;

  const bodyX = SIDE_MARGIN;
  const bodyY = topMargin;
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
      labelY: bodyY - 16,
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
      labelY: bodyY + bodyH + 16,
      labelAnchor: "start",
      rotateLabel: true,
    });
  });

  const headerZones: Rect[] = [
    { x: startX - PAD_R - 6, y: topRowY - PAD_R - 6, w: headerLen + (PAD_R + 6) * 2, h: (PAD_R + 6) * 2, rx: 6 },
    { x: startX - PAD_R - 6, y: bottomRowY - PAD_R - 6, w: headerLen + (PAD_R + 6) * 2, h: (PAD_R + 6) * 2, rx: 6 },
  ];

  return {
    vbw,
    vbh,
    body,
    accent: accentForBoard(board.id, board.vendor),
    headerZones,
    ports: sbcPorts(visual, body),
    chip: { x: bodyX + bodyW * 0.36, y: bodyY + bodyH * 0.42, w: bodyW * 0.26, h: bodyH * 0.2, rx: 8 },
    holes: corners(body, 24),
    anchors,
    padR: PAD_R,
    notToScale: Boolean(visual.notToScale),
    orientation: visual.orientation,
    revisionNote: visual.revisionNote,
  };
}

function buildEdgeConnector(board: Board, visual: BoardVisual): Omit<BoardGeometry, "kind"> {
  const p = pins(board);
  const flat: { pin: Pin; group: string }[] = [];
  for (const group of p?.groups ?? []) {
    for (const pin of group.pins) flat.push({ pin, group: group.label });
  }
  const n = Math.max(flat.length, 1);
  const pitch = clampPitch(40, n, 1200);
  const headerLen = (n - 1) * pitch;
  const hpad = 60;
  const bodyW = headerLen + hpad * 2;
  const bodyH = Math.max(bodyW / visual.aspect, 340);

  const bottomMargin = LABEL_BAND;
  const topMargin = 40;
  const vbw = SIDE_MARGIN + bodyW + SIDE_MARGIN;
  const vbh = topMargin + bodyH + bottomMargin;

  const bodyX = SIDE_MARGIN;
  const bodyY = topMargin;
  const body: Rect = { x: bodyX, y: bodyY, w: bodyW, h: bodyH, rx: 18 };

  const startX = bodyX + hpad;
  const rowY = bodyY + bodyH - 34;

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
      labelY: bodyY + bodyH + 16,
      labelAnchor: "start",
      rotateLabel: true,
    };
  });

  const headerZones: Rect[] = [
    { x: startX - PAD_R - 6, y: rowY - PAD_R - 6, w: headerLen + (PAD_R + 6) * 2, h: (PAD_R + 6) * 2 + 18, rx: 4 },
  ];

  return {
    vbw,
    vbh,
    body,
    accent: accentForBoard(board.id, board.vendor),
    headerZones,
    ports: [
      { kind: "usb-micro", x: bodyX + bodyW / 2 - 34, y: bodyY - 14, w: 68, h: 26, rx: 6 },
    ],
    chip: { x: bodyX + bodyW * 0.38, y: bodyY + bodyH * 0.28, w: bodyW * 0.24, h: bodyH * 0.2, rx: 10 },
    holes: [],
    anchors,
    padR: PAD_R,
    notToScale: Boolean(visual.notToScale),
    orientation: visual.orientation,
    revisionNote: visual.revisionNote,
  };
}

function buildGroupStrips(board: Board, visual: BoardVisual): Omit<BoardGeometry, "kind"> {
  const p = pins(board);
  const groups = p?.groups ?? [];
  const perRow = 11;
  const colPitch = 78;
  const rowPitch = 92; // includes label space under each pad
  const stripGap = 30;
  const stripTitleH = 34;

  const contentW = perRow * colPitch;
  const artH = 200; // schematic board block at the top
  const vbw = SIDE_MARGIN * 2 + contentW;
  const bodyX = SIDE_MARGIN;

  let cursorY = artH + 40;
  const anchors: PinAnchor[] = [];
  const headerZones: Rect[] = [];

  groups.forEach((group, gi) => {
    cursorY += stripTitleH;
    const rows = Math.ceil(group.pins.length / perRow);
    const zoneTop = cursorY - stripTitleH + 6;
    group.pins.forEach((pin, i) => {
      const r = Math.floor(i / perRow);
      const c = i % perRow;
      const cx = bodyX + 40 + c * colPitch;
      const cy = cursorY + r * rowPitch + 18;
      anchors.push({
        key: `g${gi}:${i}`,
        pin,
        group: group.label,
        cx,
        cy,
        side: "bottom",
        labelX: cx,
        labelY: cy + PAD_R + 14,
        labelAnchor: "middle",
        rotateLabel: false,
      });
    });
    const zoneBottom = cursorY + (rows - 1) * rowPitch + 18 + rowPitch * 0.7;
    headerZones.push({
      x: bodyX + 8,
      y: zoneTop,
      w: contentW - 16,
      h: zoneBottom - zoneTop,
      rx: 12,
    });
    cursorY = zoneBottom + stripGap;
  });

  const vbh = cursorY + 10;
  const body: Rect = {
    x: bodyX + contentW * 0.18,
    y: 24,
    w: contentW * 0.64,
    h: artH - 36,
    rx: 16,
  };

  return {
    vbw,
    vbh,
    body,
    accent: accentForBoard(board.id, board.vendor),
    headerZones,
    ports: [
      { kind: visual.ports?.[0] ?? "usb-c", x: body.x + body.w / 2 - 34, y: body.y - 12, w: 68, h: 24, rx: 6 },
    ],
    chip: { x: body.x + body.w * 0.3, y: body.y + body.h * 0.3, w: body.w * 0.4, h: body.h * 0.4, rx: 8 },
    holes: [],
    anchors,
    padR: PAD_R,
    notToScale: true,
    orientation: visual.orientation,
    revisionNote: visual.revisionNote,
  };
}

// --- decorative helpers ----------------------------------------------------
function corners(body: Rect, inset: number): Hole[] {
  return [
    { x: body.x + inset, y: body.y + inset, r: 9 },
    { x: body.x + body.w - inset, y: body.y + inset, r: 9 },
    { x: body.x + inset, y: body.y + body.h - inset, r: 9 },
    { x: body.x + body.w - inset, y: body.y + body.h - inset, r: 9 },
  ];
}

function sbcPorts(visual: BoardVisual, body: Rect): PortMark[] {
  const ports: PortMark[] = [];
  const list = visual.ports ?? [];
  // Spread the recognizable big connectors along the bottom edge.
  list.forEach((kind, i) => {
    const w = kind === "ethernet" ? body.w * 0.16 : body.w * 0.12;
    const x = body.x + body.w * (0.14 + i * 0.22);
    // Sit the metal shell on the bottom edge, protruding only slightly so it
    // stays inside the viewBox.
    ports.push({ kind, x, y: body.y + body.h - 30, w, h: 36, rx: 4 });
  });
  return ports;
}

function edgePorts(visual: BoardVisual, body: Rect): PortMark[] {
  const usb = visual.usb ?? "top";
  const w = body.w * 0.4;
  const cx = body.x + body.w / 2 - w / 2;
  const kind = visual.ports?.[0] ?? "usb-micro";
  if (usb === "top") return [{ kind, x: cx, y: body.y - 12, w, h: 26, rx: 6 }];
  if (usb === "bottom")
    return [{ kind, x: cx, y: body.y + body.h - 14, w, h: 26, rx: 6 }];
  return [];
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
