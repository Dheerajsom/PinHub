// Integrity checks for the board-visual layer. These run at module load of the
// prerendered catalog routes, so `npm run build` is the gate: missing visual
// coverage, unanchored pins, out-of-range coordinates, unmapped roles, or a
// signal label that would be drawn off the sheet or across a pad all fail the
// build rather than shipping a pinout someone could misread.

import { boards, type Pin } from "@/lib/boards";
import { boardVisuals } from "@/lib/board-visuals";
import {
  buildBoardGeometry,
  type BoardGeometry,
  type PinAnchor,
} from "@/lib/board-visual-geometry";
import { roleColors, roleLabels } from "@/components/board-visual/roles";
import {
  LABEL_CHAR_RATIO,
  stackedFontSize,
  stackedLabelExtent,
  wrapStackedLabel,
} from "@/components/board-visual/label-layout";

export type VisualValidationResult = {
  errors: string[];
  warnings: string[];
};

// Counts pins from *every* source present (pins and/or groups). Today no board
// defines both, but summing both means the anchor-count check below would catch
// a board that accidentally defined both yet only had one source rendered.
function electricalPins(pinout: NonNullable<(typeof boards)[number]["pinout"]>): Pin[] {
  const out: Pin[] = [];
  if (pinout.pins) out.push(...pinout.pins.left, ...pinout.pins.right);
  if (pinout.groups) out.push(...pinout.groups.flatMap((g) => g.pins));
  return out;
}

export function validateBoardVisuals(): VisualValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const board of boards) {
    const visual = boardVisuals[board.id];
    if (!visual) {
      errors.push(`No visual configuration for board "${board.id}".`);
      continue;
    }

    if (!board.pinout) {
      warnings.push(`Board "${board.id}" has no pinout; only artwork renders.`);
      continue;
    }

    const geometry = buildBoardGeometry(board);
    if (!geometry) {
      errors.push(`Geometry failed to build for board "${board.id}".`);
      continue;
    }

    // 1. Every electrical pin is anchored exactly once.
    const expected = electricalPins(board.pinout);
    if (expected.length !== geometry.anchors.length) {
      errors.push(
        `Board "${board.id}": ${expected.length} electrical pins but ${geometry.anchors.length} anchors.`,
      );
    }

    // 2. Anchor keys are unique (grouped pinouts reuse positions).
    const keys = new Set<string>();
    for (const anchor of geometry.anchors) {
      if (keys.has(anchor.key)) {
        errors.push(`Board "${board.id}": duplicate anchor key "${anchor.key}".`);
      }
      keys.add(anchor.key);

      // 3. Coordinates are finite and inside the viewBox.
      const { cx, cy } = anchor;
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
        errors.push(`Board "${board.id}": non-finite anchor "${anchor.key}".`);
      } else if (cx < 0 || cy < 0 || cx > geometry.vbw || cy > geometry.vbh) {
        errors.push(
          `Board "${board.id}": anchor "${anchor.key}" (${Math.round(cx)},${Math.round(cy)}) outside viewBox ${geometry.vbw}x${geometry.vbh}.`,
        );
      }

      // 4. Every role used has a render mapping.
      if (!roleColors[anchor.pin.role] || !roleLabels[anchor.pin.role]) {
        errors.push(
          `Board "${board.id}": pin role "${anchor.pin.role}" has no render mapping.`,
        );
      }
    }

    if (!Number.isFinite(geometry.vbw) || !Number.isFinite(geometry.vbh)) {
      errors.push(`Board "${board.id}": non-finite viewBox.`);
    }

    // 5. Every signal label is legible: inside the sheet, and clear of the pads.
    errors.push(...labelPlacementErrors(board.id, geometry));
  }

  return { errors, warnings };
}

// Text metrics for the drawing's label face. Rail label sizes mirror BoardStage;
// stacked labels come from the shared layout module the renderer uses, so this
// measures the text that is actually drawn.
const RAIL_FONT_ROTATED = 17;
const RAIL_FONT = 18;

type Box = { x0: number; y0: number; x1: number; y1: number };

function labelBox(anchor: PinAnchor, kind: BoardGeometry["kind"], pitch: number): Box {
  const { labelX: x, labelY: y, labelAnchor, rotateLabel } = anchor;

  if (kind === "group-strips") {
    const size = stackedFontSize(pitch);
    const lines = wrapStackedLabel(anchor.pin.label, pitch, size);
    const { width, height } = stackedLabelExtent(lines, size);
    // Stacked labels are centred on the pad's column and grow downward.
    return {
      x0: x - width / 2,
      y0: y - size / 2,
      x1: x + width / 2,
      y1: y - size / 2 + height,
    };
  }

  const size = rotateLabel ? RAIL_FONT_ROTATED : RAIL_FONT;
  const runLength = anchor.pin.label.length * size * LABEL_CHAR_RATIO;

  if (rotateLabel) {
    // Rotated -90: the run advances along -y from the rail point for "start",
    // and arrives at it from +y for "end".
    const y0 = labelAnchor === "end" ? y : y - runLength;
    const y1 = labelAnchor === "end" ? y + runLength : y;
    return { x0: x - size / 2, y0, x1: x + size / 2, y1 };
  }

  const x0 =
    labelAnchor === "end"
      ? x - runLength
      : labelAnchor === "middle"
        ? x - runLength / 2
        : x;
  return { x0, y0: y - size / 2, x1: x0 + runLength, y1: y + size / 2 };
}

/**
 * Label legibility errors for one board. Exported so tests can prove the check
 * fires — it exists to catch a regression that shipped once already (even-row
 * labels on a 2xN header aimed back across the pads instead of away from them).
 */
export function labelPlacementErrors(
  boardId: string,
  geometry: BoardGeometry,
): string[] {
  const errors: string[] = [];
  const { anchors, padR, vbw, vbh, kind, pitch } = geometry;
  // One label may sit a little proud of the sheet edge without being unreadable;
  // this only flags a rail that is clearly too shallow for its longest name.
  const bleed = 8;

  for (const anchor of anchors) {
    const box = labelBox(anchor, kind, pitch);

    if (
      box.x0 < -bleed ||
      box.y0 < -bleed ||
      box.x1 > vbw + bleed ||
      box.y1 > vbh + bleed
    ) {
      errors.push(
        `Board "${boardId}": label "${anchor.pin.label}" runs outside the sheet ` +
          `(${Math.round(box.x0)},${Math.round(box.y0)})-(${Math.round(box.x1)},${Math.round(box.y1)}) ` +
          `vs ${Math.round(vbw)}x${Math.round(vbh)}.`,
      );
    }

    // A label drawn across a pad is the failure mode that matters: it hides the
    // pin number a reader is counting to, and it means the rail is pointing back
    // into the connector instead of away from it.
    for (const other of anchors) {
      if (other.key === anchor.key) continue;
      const hit =
        box.x0 < other.cx + padR &&
        box.x1 > other.cx - padR &&
        box.y0 < other.cy + padR &&
        box.y1 > other.cy - padR;
      if (hit) {
        errors.push(
          `Board "${boardId}": label "${anchor.pin.label}" overlaps pad ` +
            `${other.pin.position} ("${other.pin.label}").`,
        );
        break;
      }
    }
  }

  return errors;
}

/** Throws with a combined message if any errors are present. */
export function assertBoardVisualsValid(): void {
  const { errors } = validateBoardVisuals();
  if (errors.length > 0) {
    throw new Error(
      `Board visual validation failed (${errors.length}):\n` +
        errors.slice(0, 20).join("\n"),
    );
  }
}
