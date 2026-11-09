import { boards } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { netForPin } from "@/lib/pin-nets";
import type { PinIndexBoard } from "@/lib/pin-match";
import { isReferenceGpio, referenceFunctions } from "@/lib/pin-reference";

function functionLabel(peripheral: string, instance: string, signal: string): string {
  const suffix = instance.toUpperCase().startsWith(peripheral) ? instance.slice(peripheral.length) : undefined;
  const named = suffix !== undefined && (suffix === "" || /^[\d_ -]/.test(suffix));
  return `${named ? instance : `${peripheral} ${instance}`} ${signal}`;
}

export function createPinIndex(): PinIndexBoard[] {
  return boards.flatMap((board) => {
    const geometry = buildBoardGeometry(board);
    if (!geometry) return [];
    return [{ id: board.id, pins: geometry.anchors.map(({ key, pin, group }) => ({
      key, position: pin.position, label: pin.label, role: pin.role,
      gpio: isReferenceGpio(pin),
      ...(pin.aliases?.length ? { aliases: pin.aliases } : {}),
      ...(pin.note ? { note: pin.note } : {}),
      ...(pin.flags?.length ? { flags: pin.flags } : {}),
      ...(pin.functions?.some((item) => item.default) ? { defaultSignals: [...new Set(pin.functions.filter((item) => item.default).flatMap((item) => [item.peripheral, item.signal]))] } : {}),
      ...(referenceFunctions(pin, board.pinFunctions).length ? { signals: [...new Set(referenceFunctions(pin, board.pinFunctions).flatMap((item) => [item.peripheral, item.signal, functionLabel(item.peripheral, item.instance, item.signal)]))] } : {}),
      ...(group ? { group } : {}),
      ...(netForPin(pin) ? { net: netForPin(pin)!.label } : {}),
    })) }];
  });
}
