// One shape and glyph per status, used alike by the summary strip, the tally,
// the editor hints and the report cards, so no status is told by colour alone.
// fix = filled square with a cross, check = ring with "!", clear = check mark,
// not matched to this board's record = "?".

export type Status = "fix" | "check" | "clear" | "missing";

export const statusGlyph: Record<Status, string> = { fix: "✕", check: "!", clear: "✓", missing: "?" };

export const statusText: Record<"fix" | "check" | "clear", string> = { fix: "Fix", check: "Check", clear: "Clear" };
