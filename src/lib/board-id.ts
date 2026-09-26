/** Longest board id accepted from storage, URLs, or other untrusted input. */
export const maxBoardIdLength = 128;

const boardIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * True for strings shaped like a catalog board id (lowercase kebab-case). Every
 * catalog id has this shape (enforced by the catalog integrity test), so input
 * that fails it can be dropped at the storage or URL boundary before it is
 * kept, counted against a capacity limit, or looked up.
 */
export function isBoardId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= maxBoardIdLength &&
    boardIdPattern.test(value)
  );
}
