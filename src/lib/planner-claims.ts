import type { Board, Pin } from "./boards";

// Manual pin claims for the planner: "this pin is in use, for this". The name
// is the only free text a user can put in a shared planner link, so it is
// filtered to a small character set and bounded wherever it is read or written.

/** A claim as stored in the URL: a board-visual anchor key and a short name. */
export type PinClaim = { key: string; name: string };

export type ClaimCaution = { label: string; note: string };

/** A claim resolved against a board, as the exports and tables use it. */
export type ClaimedPin = { name: string; pin: Pin; group?: string; cautions: ClaimCaution[] };

export const maxClaims = 64;
export const maxClaimNameLength = 24;
export const maxUseParamLength = 2048;

const disallowed = /[^A-Za-z0-9 _+\-./#]+/g;
const maxNameScan = 256;

/** Filter for the text field: drops disallowed characters, keeps spacing. */
export function claimNameInput(value: string): string {
  return value.slice(0, maxNameScan).replace(disallowed, "").slice(0, maxClaimNameLength);
}

/** Canonical stored form: filtered, single-spaced, trimmed, bounded. */
export function cleanClaimName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .slice(0, maxNameScan)
    .replace(disallowed, "")
    .replace(/ +/g, " ")
    .trim()
    .slice(0, maxClaimNameLength)
    .trim();
}

/**
 * Risks the record states for a pin: the board's own note for each flag, and
 * the reserved role. Nothing is inferred from the label or the role otherwise.
 */
export function claimCautions(board: Board, pin: Pin): ClaimCaution[] {
  const notes = board.pinFunctions?.flagNotes ?? {};
  const cautions: ClaimCaution[] = (pin.flags ?? []).flatMap((flag) => {
    const note = notes[flag];
    return note ? [{ label: flag.replaceAll("-", " "), note }] : [];
  });
  if (pin.role === "reserved") {
    cautions.push({
      label: "reserved",
      note: pin.note ?? "The catalog records this pin as reserved.",
    });
  }
  return cautions;
}
