import { pinRoles, type LookupRole } from "@/lib/pin-match";
import { isBoardId } from "@/lib/board-id";

/**
 * The capability filters on a board's pin map ("Show pins"), in display order.
 * Kept here, beside the URL state that stores them, so `?show=` is validated
 * against the one list the chips are drawn from.
 */
export const pinoutCategories = [
  "gpio",
  "power",
  "ground",
  "analog",
  "pwm",
  "uart",
  "i2c",
  "spi",
  "boot",
  "reserved",
] as const;
export type PinoutCategory = (typeof pinoutCategories)[number];

export type PinoutState = {
  role: LookupRole | null;
  pin: string | null;
  /** Active "Show pins" filters; absent when none are on. */
  show?: readonly PinoutCategory[];
};
const empty: PinoutState = { role: null, pin: null };
export const maxPinoutSearchLength = 256;
function validKey(value: string | null): value is string {
  return value !== null && value.length <= 32 && /^(?:p[LR]|g\d{1,3}|e):\d{1,3}$/.test(value);
}
/**
 * Known categories only, each once, in display order. The list is bounded by
 * the category count, so a hostile `?show=` cannot grow the state.
 */
function validShow(value: string | null | readonly string[] | undefined): PinoutCategory[] {
  if (value === null || value === undefined) return [];
  const parts = typeof value === "string" ? value.split(",") : value;
  if (parts.length > pinoutCategories.length) return [];
  const wanted = new Set(parts);
  return pinoutCategories.filter((category) => wanted.has(category));
}
export function parsePinoutState(search: string, keys: ReadonlySet<string>, roles: ReadonlySet<string>): PinoutState {
  if (search.length > maxPinoutSearchLength) return { ...empty };
  const params = new URLSearchParams(search);
  const role = params.getAll("role").length === 1 ? params.get("role") : null;
  const pin = params.getAll("pin").length === 1 ? params.get("pin") : null;
  const show = params.getAll("show").length === 1 ? validShow(params.get("show")) : [];
  return {
    role: role && pinRoles.some((item) => item === role) && roles.has(role) ? role as LookupRole : null,
    pin: validKey(pin) && keys.has(pin) ? pin : null,
    ...(show.length ? { show } : {}),
  };
}
export function serializePinoutState(state: PinoutState, keys: ReadonlySet<string>, roles: ReadonlySet<string>): string {
  const params = new URLSearchParams();
  if (pinRoles.some((role) => role === state.role) && roles.has(state.role!)) params.set("role", state.role!);
  if (validKey(state.pin) && keys.has(state.pin)) params.set("pin", state.pin);
  const show = validShow(state.show);
  if (show.length) params.set("show", show.join(","));
  const valid = parsePinoutState(params.toString(), keys, roles);
  const result = new URLSearchParams();
  if (valid.role) result.set("role", valid.role);
  if (valid.pin) result.set("pin", valid.pin);
  if (valid.show?.length) result.set("show", valid.show.join(","));
  return result.toString();
}
export function pinLookupHref(id: string, pin: string): string {
  if (!isBoardId(id) || !validKey(pin)) return "/";
  return `/boards/${id}?${new URLSearchParams({ pin })}#pins`;
}
