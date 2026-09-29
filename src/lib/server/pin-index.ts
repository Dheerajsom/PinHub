import { boards } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { netForPin } from "@/lib/pin-nets";
import type { PinIndexBoard } from "@/lib/pin-match";

export function createPinIndex(): PinIndexBoard[] {
  return boards.flatMap((board) => {
    const geometry = buildBoardGeometry(board);
    if (!geometry) return [];
    return [{ id: board.id, pins: geometry.anchors.map(({ key, pin, group }) => ({
      key, position: pin.position, label: pin.label, role: pin.role,
      ...(pin.aliases?.length ? { aliases: pin.aliases } : {}),
      ...(pin.note ? { note: pin.note } : {}),
      ...(pin.flags?.length ? { flags: pin.flags } : {}),
      ...(group ? { group } : {}),
      ...(netForPin(pin) ? { net: netForPin(pin)!.label } : {}),
    })) }];
  });
}
