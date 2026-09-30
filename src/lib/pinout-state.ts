import { pinRoles, type LookupRole } from "@/lib/pin-match";
import { isBoardId } from "@/lib/board-id";

export type PinoutState = { role: LookupRole | null; pin: string | null };
const empty: PinoutState = { role: null, pin: null };
export const maxPinoutSearchLength = 256;
function validKey(value: string | null): value is string {
  return value !== null && value.length <= 32 && /^(?:p[LR]|g\d{1,3}|e):\d{1,3}$/.test(value);
}
export function parsePinoutState(search: string, keys: ReadonlySet<string>, roles: ReadonlySet<string>): PinoutState {
  if (search.length > maxPinoutSearchLength) return { ...empty };
  const params = new URLSearchParams(search);
  const role = params.getAll("role").length === 1 ? params.get("role") : null;
  const pin = params.getAll("pin").length === 1 ? params.get("pin") : null;
  return {
    role: role && pinRoles.some((item) => item === role) && roles.has(role) ? role as LookupRole : null,
    pin: validKey(pin) && keys.has(pin) ? pin : null,
  };
}
export function serializePinoutState(state: PinoutState, keys: ReadonlySet<string>, roles: ReadonlySet<string>): string {
  const params = new URLSearchParams();
  if (pinRoles.some((role) => role === state.role) && roles.has(state.role!)) params.set("role", state.role!);
  if (validKey(state.pin) && keys.has(state.pin)) params.set("pin", state.pin);
  const valid = parsePinoutState(params.toString(), keys, roles);
  const result = new URLSearchParams();
  if (valid.role) result.set("role", valid.role);
  if (valid.pin) result.set("pin", valid.pin);
  return result.toString();
}
export function pinLookupHref(id: string, pin: string): string {
  if (!isBoardId(id) || !validKey(pin)) return "/";
  return `/pinout/${id}?${new URLSearchParams({ pin })}`;
}
