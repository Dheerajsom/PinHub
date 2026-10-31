import type { Board, PinRole } from "./boards";
import { roleLabels, roleOrder } from "@/components/board-visual/roles";

// Data behind a board's link-preview image. Every pad on the card is one pin
// the catalog lists, in the order it lists them, so the card never draws a
// connector the record cannot back.

export const shareCardMaxRows = 4;
export const shareCardMaxPadsPerRow = 60;

export type ShareCardRow = {
  /** Connector side or group name, as the catalog writes it. */
  label: string;
  roles: PinRole[];
  /** Pins on this row past the pad limit. */
  more: number;
};

export type ShareCardModel = {
  name: string;
  vendor: string;
  /** Processor and logic level, the two facts someone wiring the board needs first. */
  detail: string;
  pinCount: number;
  rows: ShareCardRow[];
  /** Rows past `shareCardMaxRows`. */
  moreRows: number;
  /** Every role on the drawn pins, so no pad color goes unexplained. */
  legend: { role: PinRole; label: string; count: number }[];
};

function row(label: string, roles: PinRole[]): ShareCardRow {
  return {
    label,
    roles: roles.slice(0, shareCardMaxPadsPerRow),
    more: Math.max(0, roles.length - shareCardMaxPadsPerRow),
  };
}

export function shareCardModel(board: Board): ShareCardModel {
  const pinout = board.pinout;
  const allRows: ShareCardRow[] = pinout?.pins
    ? [
        row("Left", pinout.pins.left.map((pin) => pin.role)),
        row("Right", pinout.pins.right.map((pin) => pin.role)),
      ].filter((item) => item.roles.length)
    : (pinout?.groups ?? [])
        .filter((group) => group.pins.length)
        .map((group) => row(group.label, group.pins.map((pin) => pin.role)));

  const roles = pinout?.pins
    ? [...pinout.pins.left, ...pinout.pins.right].map((pin) => pin.role)
    : (pinout?.groups ?? []).flatMap((group) => group.pins.map((pin) => pin.role));
  const counts = new Map<PinRole, number>();
  for (const role of roles) counts.set(role, (counts.get(role) ?? 0) + 1);
  const legend = roleOrder
    .filter((role) => counts.has(role))
    .map((role) => ({ role, label: roleLabels[role], count: counts.get(role)! }));

  return {
    name: board.name,
    vendor: board.vendor,
    detail: [board.processor, board.logicLevel].filter(Boolean).join(" · "),
    pinCount: roles.length,
    rows: allRows.slice(0, shareCardMaxRows),
    moreRows: Math.max(0, allRows.length - shareCardMaxRows),
    legend,
  };
}
