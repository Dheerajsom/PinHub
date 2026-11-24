import type { Board } from "@/lib/boards";
import { getBoardDiscoveryProfile, type ComputeClass, type LogicProfile } from "@/lib/board-discovery";
import {
  defaultPlanStepBudget,
  normalizePlanRequirements,
  planPeripherals,
  planPins,
  type PlanAssignment,
  type PlanRequirements,
} from "@/lib/pin-planner";
import { boardParam, parsePlanParam, planParam, serializePlan } from "@/lib/plan-params";

// Board finder: "which boards can take everything my project needs, at once?"
// It runs the pin planner's own search on every board with source-backed pin
// functions, with the planner's own step budget, so a board listed as a fit
// opens in the planner as exactly that plan. Nothing here reads labels or
// aliases, and a board the search could not settle is reported as such rather
// than as a fit or a miss.

/** Optional narrowing, each read from the board record's discovery profile. */
export const finderFilters = {
  platform: [
    { value: "mcu", label: "Microcontroller", match: "Microcontroller" },
    { value: "sbc", label: "Linux SBC", match: "Linux SBC" },
  ],
  logic: [
    { value: "3v3", label: "3.3 V logic", match: "3.3 V" },
    { value: "5v", label: "5 V logic", match: "5 V" },
  ],
  wireless: [
    { value: "wifi", label: "Wi-Fi", match: "Wi-Fi" },
    { value: "bluetooth", label: "Bluetooth", match: "Bluetooth" },
  ],
} as const satisfies Record<string, ReadonlyArray<{ value: string; label: string; match: string }>>;

export type FinderFilterKey = keyof typeof finderFilters;
export const finderFilterKeys = Object.keys(finderFilters) as FinderFilterKey[];

export type FinderQuery = {
  requirements: PlanRequirements;
  filters: Partial<Record<FinderFilterKey, string>>;
};

export type FinderFit = {
  board: Board;
  assignments: PlanAssignment[];
  /** A pin with a recorded caution had to be used because nothing else fitted. */
  usedFlaggedPins: boolean;
};

export type FinderResult = {
  /** Boards that pass the filters and carry source-backed pin functions. */
  checked: number;
  /** Clean fits first, then fits that need cautioned pins; each in catalog order. */
  fits: FinderFit[];
  misses: Array<{ board: Board; reason: string }>;
  /** The planner's step budget ran out before it found or ruled out a plan. */
  undecided: Board[];
  /** Pass the filters but have no source-backed pin functions to plan with. */
  unchecked: Board[];
};

/** Longest query string read; the plan itself is capped by `parsePlanParam`. */
export const maxFinderSearchLength = 256;

type SearchInput = string | URLSearchParams | Record<string, string | string[] | undefined>;

function toParams(input: SearchInput): URLSearchParams {
  if (typeof input === "string") return new URLSearchParams(input);
  if (input instanceof URLSearchParams) return input;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, item);
  }
  return params;
}

/**
 * Reads `?plan=i2c1.spi1&platform=mcu&logic=3v3&wireless=wifi`. Unknown keys
 * and values are dropped, a repeated key is ignored, and an oversized query is
 * read as empty, so the URL can never ask for more than the form can show.
 */
export function parseFinderQuery(input: SearchInput): FinderQuery {
  // Check the raw length before parsing, so a huge string is never parsed and
  // a long one is rejected whole rather than cut down into a different query.
  if (typeof input === "string" && input.length > maxFinderSearchLength + 1) return { requirements: {}, filters: {} };
  const params = toParams(input);
  if (params.toString().length > maxFinderSearchLength) return { requirements: {}, filters: {} };
  const single = (key: string) => (params.getAll(key).length === 1 ? params.get(key) : null);
  const filters: FinderQuery["filters"] = {};
  for (const key of finderFilterKeys) {
    const value = single(key);
    if (finderFilters[key].some((option) => option.value === value)) filters[key] = value!;
  }
  return { requirements: parsePlanParam(single(planParam)), filters };
}

/** Canonical query string (no leading `?`): plan first, then filters in order. */
export function serializeFinderQuery(query: FinderQuery): string {
  const params = new URLSearchParams();
  const plan = serializePlan(normalizePlanRequirements(query.requirements));
  if (plan) params.set(planParam, plan);
  for (const key of finderFilterKeys) {
    const value = query.filters[key];
    if (finderFilters[key].some((option) => option.value === value)) params.set(key, value!);
  }
  return params.toString();
}

export function hasRequirements(requirements: PlanRequirements): boolean {
  return planPeripherals.some((peripheral) => (requirements[peripheral] ?? 0) > 0);
}

function passesFilters(board: Board, filters: FinderQuery["filters"]): boolean {
  const profile = getBoardDiscoveryProfile(board);
  const want = <K extends FinderFilterKey>(key: K) =>
    finderFilters[key].find((option) => option.value === filters[key])?.match;
  const platform = want("platform");
  if (platform && profile.computeClass !== (platform as ComputeClass)) return false;
  const logic = want("logic");
  if (logic && profile.logicProfile !== (logic as LogicProfile)) return false;
  const wireless = want("wireless");
  if (wireless && !profile.wireless.some((item) => item === wireless)) return false;
  return true;
}

/**
 * Every board in `catalog` order, split by whether the requirements fit. The
 * step budget is the planner's own, so the two always agree on a board.
 */
export function findBoards(
  catalog: readonly Board[],
  query: FinderQuery,
  budget = defaultPlanStepBudget,
): FinderResult {
  const result: FinderResult = { checked: 0, fits: [], misses: [], undecided: [], unchecked: [] };
  const requirements = normalizePlanRequirements(query.requirements);
  const cautioned: FinderFit[] = [];
  for (const board of catalog) {
    if (!passesFilters(board, query.filters)) continue;
    if (!board.pinFunctions || !board.pinout) {
      result.unchecked.push(board);
      continue;
    }
    result.checked += 1;
    if (!hasRequirements(requirements)) continue;
    const plan = planPins(board, requirements, budget);
    if (plan.status === "ok") {
      const fit = { board, assignments: plan.assignments, usedFlaggedPins: plan.usedFlaggedPins };
      (plan.usedFlaggedPins ? cautioned : result.fits).push(fit);
    } else if (plan.status === "unsatisfiable") {
      if (plan.exhausted) result.undecided.push(board);
      else result.misses.push({ board, reason: plan.reason });
    }
  }
  result.fits.push(...cautioned);
  return result;
}

/** The planner, opened on this board with the finder's requirements filled in. */
export function plannerHref(boardId: string, requirements: PlanRequirements): string {
  const params = new URLSearchParams({ [boardParam]: boardId });
  const plan = serializePlan(normalizePlanRequirements(requirements));
  if (plan) params.set(planParam, plan);
  return `/planner?${params}`;
}

/** One line per requested unit, e.g. "I2C0 · SDA GP4 · SCL GP5". */
export function assignmentLines(assignments: readonly PlanAssignment[]): string[] {
  const units = new Map<string, PlanAssignment[]>();
  for (const assignment of assignments) {
    const key = `${assignment.peripheral}-${assignment.unit}`;
    units.set(key, [...(units.get(key) ?? []), assignment]);
  }
  return [...units.values()].map((unit) => {
    const [first] = unit;
    const name = first.instance ?? `${first.peripheral} ${first.unit}`;
    const pins = unit.map((item) =>
      item.signal === "IO" || unit.length === 1 && !first.instance
        ? item.pin.label
        : `${item.signal} ${item.pin.label}`,
    );
    return [name, ...pins].join(" · ");
  });
}
