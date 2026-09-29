import { isBoardId } from "@/lib/board-id";
import { pinRoles, type PinIndexBoard } from "@/lib/pin-match";

export function parsePinIndex(value: unknown): PinIndexBoard[] {
  if (!Array.isArray(value) || value.length > 512) throw new Error("Invalid pin index");
  let total = 0;
  const text = (item: unknown, max = 2048) => typeof item === "string" && item.length <= max;
  for (const board of value) {
    if (!board || typeof board !== "object" || !isBoardId(board.id) || !Array.isArray(board.pins) || board.pins.length > 1024) throw new Error("Invalid board pins");
    total += board.pins.length;
    if (total > 10000) throw new Error("Too many pins");
    for (const pin of board.pins) {
      if (!pin || !text(pin.key, 32) || !/^(?:p[LR]|g\d{1,3}|e):\d{1,3}$/.test(pin.key) ||
        !Number.isSafeInteger(pin.position) || pin.position < 1 || pin.position > 10000 ||
        !text(pin.label, 128) || !pinRoles.includes(pin.role) ||
        [pin.note, pin.group, pin.net].some((item) => item !== undefined && !text(item)) ||
        [pin.aliases, pin.flags].some((items) => items !== undefined && (!Array.isArray(items) || items.length > 64 || items.some((item: unknown) => !text(item, 256))))) throw new Error("Invalid pin record");
    }
  }
  return value as PinIndexBoard[];
}
