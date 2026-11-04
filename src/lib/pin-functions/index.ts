import type { Board, BoardInterface, PinFunctionData, Pinout } from "../boards";
import { arduinoCoreBoards, arduinoCorePinFunctions, type ArduinoCoreBoardId } from "./arduino-core";
import { espressifBoards, espressifPinFunctions, type EspressifBoardId } from "./espressif";
import { raspberryPiBoards, raspberryPiPinFunctions, type RaspberryPiBoardId } from "./raspberry-pi";
import { stm32Boards, stm32PinFunctions, type Stm32BoardId } from "./stm32";

type PlannerFields = { pinout: Pinout; pinFunctions: PinFunctionData };

function plannerFields(id: string, pinout: Pinout): PlannerFields | null {
  if (id in espressifBoards) return espressifPinFunctions(id as EspressifBoardId, pinout);
  if (id in raspberryPiBoards) return raspberryPiPinFunctions(id as RaspberryPiBoardId, pinout);
  if (id in stm32Boards) return stm32PinFunctions(id as Stm32BoardId, pinout);
  if (id in arduinoCoreBoards) return arduinoCorePinFunctions(id as ArduinoCoreBoardId, pinout);
  return null;
}

function allPins(pinout: Pinout) {
  return pinout.pins
    ? [...pinout.pins.left, ...pinout.pins.right]
    : (pinout.groups ?? []).flatMap((group) => group.pins);
}

/**
 * A board with its planner data attached, for boards whose chip family has a
 * table here. The board's interface list gains any peripheral that data shows,
 * so the catalog's filters agree with what the planner can assign.
 */
export function withPlannerData(board: Board): Board {
  if (board.pinFunctions || !board.pinout) return board;
  const fields = plannerFields(board.id, board.pinout);
  if (!fields) return board;
  const found = new Set<string>(board.interfaces);
  for (const pin of allPins(fields.pinout)) {
    for (const item of pin.functions ?? []) found.add(item.peripheral);
  }
  for (const item of fields.pinFunctions.mux.routable ?? []) found.add(item.peripheral);
  return { ...board, ...fields, interfaces: [...found] as BoardInterface[] };
}
