import { dialects, maxSourceLength, type Dialect } from "@/lib/code-check/scan";

// The pin check's draft survives a reload in this tab only (sessionStorage);
// it is never sent anywhere. The same code limit applies when it is written
// and when it is read back.

export type DialectChoice = Dialect | "auto";

export type Draft = { code: string; dialect: DialectChoice };

export const draftKey = "pinhub.check.draft";

/**
 * Ceiling on the stored JSON before it is parsed. JSON escaping can grow a
 * character to six (`\u0001`), so a draft at the code limit can be up to six
 * times longer once stored; the parsed code is then held to the code limit.
 */
export const maxStoredDraftLength = maxSourceLength * 6 + 256;

export function isDialectChoice(value: unknown): value is DialectChoice {
  return typeof value === "string" && (value === "auto" || (dialects as readonly string[]).includes(value));
}

/** The stored form of a draft, or null when nothing should be stored. */
export function serializeDraft(code: string, dialect: DialectChoice): string | null {
  if (!code || code.length > maxSourceLength) return null;
  return JSON.stringify({ code, dialect: isDialectChoice(dialect) ? dialect : "auto" });
}

export function parseDraft(raw: unknown): Draft | null {
  if (typeof raw !== "string" || !raw || raw.length > maxStoredDraftLength) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const { code, dialect } = parsed as { code?: unknown; dialect?: unknown };
  if (typeof code !== "string" || !code || code.length > maxSourceLength) return null;
  return { code, dialect: isDialectChoice(dialect) ? dialect : "auto" };
}

export function readDraft(storage: Pick<Storage, "getItem"> | undefined = globalThis.sessionStorage): Draft | null {
  try {
    return parseDraft(storage?.getItem(draftKey));
  } catch {
    return null;
  }
}

export function writeDraft(
  code: string,
  dialect: DialectChoice,
  storage: Pick<Storage, "setItem" | "removeItem"> | undefined = globalThis.sessionStorage,
): void {
  try {
    const value = serializeDraft(code, dialect);
    if (value === null) {
      // Over the limit is never stored; an empty editor clears the draft.
      if (!code) storage?.removeItem(draftKey);
    } else storage?.setItem(draftKey, value);
  } catch {
    // A refused write only loses the reload convenience.
  }
}
