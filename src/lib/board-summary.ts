import type { Board } from "@/lib/boards";
import {
  getBoardDiscoveryProfile,
  type BoardDiscoveryProfile,
} from "@/lib/board-discovery";

// The catalog only needs fields used by search and result rows. Keeping pin
// maps, source lists, and long-form detail data out of this shape prevents the
// home page from hydrating the entire hardware database up front.
export type BoardSummary = Pick<
  Board,
  | "id"
  | "name"
  | "vendor"
  | "category"
  | "family"
  | "processor"
  | "logicLevel"
  | "power"
  | "formFactor"
  | "description"
  | "tags"
  | "interfaces"
> & {
  discovery: BoardDiscoveryProfile;
  hasPinout: boolean;
  warningCount: number;
  warningSearchText: string;
};

export function summarizeBoard(board: Board): BoardSummary {
  return {
    id: board.id,
    name: board.name,
    vendor: board.vendor,
    category: board.category,
    family: board.family,
    processor: board.processor,
    logicLevel: board.logicLevel,
    power: board.power,
    formFactor: board.formFactor,
    description: board.description,
    tags: board.tags,
    interfaces: board.interfaces,
    hasPinout: Boolean(board.pinout),
    discovery: getBoardDiscoveryProfile(board),
    warningCount: board.warnings.length,
    warningSearchText: board.warnings.join(" "),
  };
}
