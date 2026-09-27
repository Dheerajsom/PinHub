import {
  maxPlanCount,
  planPeripherals,
  type PlanPeripheral,
  type PlanRequirements,
} from "@/lib/pin-planner";

// The planner's URL state: `?plan=i2c2.spi1.pwm3.adc2.gpio4`. The value comes
// from shared links, so it is parsed as untrusted input: bounded in length and
// token count, unknown keys and out-of-range counts dropped, first token wins.

export const planParam = "plan";
export const maxPlanParamLength = 64;
const maxPlanTokens = planPeripherals.length;
const maxSearchScan = 4096;
const tokenPattern = /^([a-z0-9]+?)(\d)$/;

const peripheralByKey = new Map<string, PlanPeripheral>(
  planPeripherals.map((peripheral) => [peripheral.toLowerCase(), peripheral]),
);

export function parsePlanParam(value: string | null | undefined): PlanRequirements {
  if (typeof value !== "string" || !value || value.length > maxPlanParamLength) return {};
  const requirements: PlanRequirements = {};
  for (const token of value.toLowerCase().split(".").slice(0, maxPlanTokens)) {
    const match = tokenPattern.exec(token);
    if (!match) continue;
    const peripheral = peripheralByKey.get(match[1]);
    const count = Number(match[2]);
    if (!peripheral || peripheral in requirements) continue;
    if (count < 1 || count > maxPlanCount) continue;
    requirements[peripheral] = count;
  }
  return requirements;
}

/** Canonical form: fixed peripheral order, zero counts omitted. */
export function serializePlan(requirements: PlanRequirements): string {
  return planPeripherals
    .flatMap((peripheral) => {
      const count = requirements[peripheral] ?? 0;
      return Number.isInteger(count) && count >= 1 && count <= maxPlanCount
        ? [`${peripheral.toLowerCase()}${count}`]
        : [];
    })
    .join(".");
}

export function planFromSearch(search: string): PlanRequirements {
  const params = new URLSearchParams(search.slice(0, maxSearchScan));
  return parsePlanParam(params.get(planParam));
}

/**
 * `search` with the plan parameter set to `requirements` (or removed when
 * empty). Other parameters are kept in their order.
 */
export function searchWithPlan(search: string, requirements: PlanRequirements): string {
  const params = new URLSearchParams(search.slice(0, maxSearchScan));
  const value = serializePlan(requirements);
  if (value) params.set(planParam, value);
  else params.delete(planParam);
  const next = params.toString();
  return next ? `?${next}` : "";
}
