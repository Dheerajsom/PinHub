import type { Board } from "@/lib/boards";
import {
  getBoardDiscoveryProfile,
  type BoardDiscoveryProfile,
} from "@/lib/board-discovery";
import { classifySource } from "@/lib/source-trust";

// The catalog only needs fields used by search, facets, and index rows. Keeping
// pin maps, source lists, and long-form detail data out of this shape prevents
// the first screen from hydrating the entire hardware database up front.
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
  /** True when PinHub publishes an in-app pin map for this connector. */
  hasPinout: boolean;
  /** Electrical pins on the mapped connector; 0 when there is no map. */
  pinCount: number;
  warningCount: number;
  warningSearchText: string;
  /** At least one source link published by the board or primary-chip vendor. */
  hasOfficialDocumentation: boolean;
  /** Position in the source catalog array, for "recently added" ordering. */
  catalogIndex: number;
};

function countPins(board: Board): number {
  const pinout = board.pinout;
  if (!pinout) return 0;
  if (pinout.pins) return pinout.pins.left.length + pinout.pins.right.length;
  return (pinout.groups ?? []).reduce(
    (total, group) => total + group.pins.length,
    0,
  );
}

export function summarizeBoard(board: Board, catalogIndex = 0): BoardSummary {
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
    pinCount: countPins(board),
    discovery: getBoardDiscoveryProfile(board),
    warningCount: board.warnings.length,
    warningSearchText: board.warnings.join(" "),
    hasOfficialDocumentation: board.sourceLinks.some(
      (source) => classifySource(board.vendor, source.url) === "official",
    ),
    catalogIndex,
  };
}
