/** How many boards the comparison workspace renders side by side. */
export const maxComparedBoards = 4;

// Only the first few ids of a `?boards=` value are ever meaningful, so the
// input is bounded before it is split. That keeps a hostile query string on
// this request-rendered page from expanding into a large intermediate array.
const maxPartLength = 256;

/**
 * Parses the `boards` query parameter into an ordered, de-duplicated list of
 * candidate board ids. Ids are not validated here; the caller resolves them
 * against the catalog and silently drops the ones that do not exist.
 */
export function parseComparedIds(
  value: string | string[] | undefined,
): string[] {
  const parts = (Array.isArray(value) ? value : [value ?? ""])
    .slice(0, maxComparedBoards)
    .flatMap((part) => part.slice(0, maxPartLength).split(","))
    .map((part) => part.trim())
    .filter(Boolean);

  return [...new Set(parts)].slice(0, maxComparedBoards);
}

/** Builds the canonical, shareable comparison URL for an ordered board set. */
export function compareUrl(ids: readonly string[], pathname = "/compare"): string {
  const selected = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(
    0,
    maxComparedBoards,
  );
  if (!selected.length) return pathname;
  return `${pathname}?boards=${selected.map(encodeURIComponent).join(",")}`;
}
