import {
  maxPlanCount,
  planPeripherals,
  type PlanPeripheral,
  type PlanRequirements,
} from "@/lib/pin-planner";
import { isBoardId } from "@/lib/board-id";
import {
  cleanClaimName,
  maxClaims,
  maxUseParamLength,
  type PinClaim,
} from "@/lib/planner-claims";

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

// The planner page's own state: `?board=<id>&use=<key>~<name>,<key>~<name>`.
// Anchor keys look like `pL:3` or `g1:12`; names never contain `~` or `,`
// (see `cleanClaimName`), so the two separators cannot be forged by a name.

export const boardParam = "board";
export const useParam = "use";
const anchorKeyPattern = /^[A-Za-z0-9]{1,8}:\d{1,4}$/;

export function boardFromSearch(search: string): string | null {
  const value = new URLSearchParams(search.slice(0, maxSearchScan)).get(boardParam);
  return isBoardId(value) ? value : null;
}

export function parseUseParam(
  value: string | null | undefined,
  validKeys: ReadonlySet<string>,
): PinClaim[] {
  if (typeof value !== "string" || !value || value.length > maxUseParamLength) return [];
  const claims: PinClaim[] = [];
  const seen = new Set<string>();
  for (const token of value.split(",")) {
    if (claims.length >= maxClaims) break;
    const split = token.indexOf("~");
    const key = split === -1 ? token : token.slice(0, split);
    if (!anchorKeyPattern.test(key) || !validKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    claims.push({ key, name: cleanClaimName(split === -1 ? "" : token.slice(split + 1)) });
  }
  return claims;
}

export function serializeUse(claims: readonly PinClaim[]): string {
  const tokens: string[] = [];
  let length = 0;
  for (const claim of claims.slice(0, maxClaims)) {
    if (!anchorKeyPattern.test(claim.key)) continue;
    const token = `${claim.key}~${cleanClaimName(claim.name)}`;
    if (length + token.length + 1 > maxUseParamLength) break;
    tokens.push(token);
    length += token.length + 1;
  }
  return tokens.join(",");
}

export function claimsFromSearch(search: string, validKeys: ReadonlySet<string>): PinClaim[] {
  const params = new URLSearchParams(search.slice(0, maxSearchScan));
  return parseUseParam(params.get(useParam), validKeys);
}

/** `search` with the plan and claims set (or removed when empty); the rest is kept. */
export function searchWithPlanner(
  search: string,
  requirements: PlanRequirements,
  claims: readonly PinClaim[],
): string {
  const params = new URLSearchParams(search.slice(0, maxSearchScan));
  const plan = serializePlan(requirements);
  if (plan) params.set(planParam, plan);
  else params.delete(planParam);
  const use = serializeUse(claims);
  if (use) params.set(useParam, use);
  else params.delete(useParam);
  const next = params.toString();
  return next ? `?${next}` : "";
}
