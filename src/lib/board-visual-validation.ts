// Integrity checks for the board-visual layer. Run in development (the
// visualization throws if these fail) and intended to be the gate that catches
// missing coverage, unanchored pins, or out-of-range coordinates before they
// ship. Pure functions so they can also be exercised by a future test runner.

import { boards, type Pin } from "@/lib/boards";
import { boardVisuals } from "@/lib/board-visuals";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { roleLabels, roleSvgColors } from "@/components/board-visual/roles";

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
      if (!roleSvgColors[anchor.pin.role] || !roleLabels[anchor.pin.role]) {
        errors.push(
          `Board "${board.id}": pin role "${anchor.pin.role}" has no render mapping.`,
        );
      }
    }

    if (!Number.isFinite(geometry.vbw) || !Number.isFinite(geometry.vbh)) {
      errors.push(`Board "${board.id}": non-finite viewBox.`);
    }
  }

  return { errors, warnings };
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
