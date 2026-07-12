import type { Board } from "@/lib/boards";

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
  | "description"
  | "tags"
  | "interfaces"
> & {
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
    description: board.description,
    tags: board.tags,
    interfaces: board.interfaces,
    hasPinout: Boolean(board.pinout),
    warningCount: board.warnings.length,
    warningSearchText: board.warnings.join(" "),
  };
}
