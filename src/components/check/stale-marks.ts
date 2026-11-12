// While a scan of newer text is pending, the editor keeps drawing the last
// scan's marks instead of blanking them. These helpers move those marks past
// the one contiguous edit that separates the scanned text from the text on
// screen, so underlines stay on their references until the new scan lands.

export type TextEdit = {
  /** First offset that differs. */
  from: number;
  /** End of the replaced region in the scanned text. */
  oldEnd: number;
  /** Characters added (negative when removed). */
  delta: number;
  /** 1-based lines of `from` and `oldEnd` in the scanned text. */
  fromLine: number;
  oldEndLine: number;
  /** Lines added (negative when removed). */
  lineDelta: number;
  /** `from` / `oldEnd` sit at the start of their line. */
  fromAtLineStart: boolean;
  oldEndAtLineStart: boolean;
};

function countNewlines(text: string, from: number, to: number): number {
  let count = 0;
  for (let index = text.indexOf("\n", from); index !== -1 && index < to; index = text.indexOf("\n", index + 1)) count += 1;
  return count;
}

/** The single replaced region between two texts, or null when they are equal. */
export function diffEdit(scanned: string, shown: string): TextEdit | null {
  if (scanned === shown) return null;
  const shortest = Math.min(scanned.length, shown.length);
  let from = 0;
  while (from < shortest && scanned.charCodeAt(from) === shown.charCodeAt(from)) from += 1;
  let tail = 0;
  while (
    tail < shortest - from &&
    scanned.charCodeAt(scanned.length - 1 - tail) === shown.charCodeAt(shown.length - 1 - tail)
  ) {
    tail += 1;
  }
  const oldEnd = scanned.length - tail;
  const newEnd = shown.length - tail;
  const fromLine = countNewlines(scanned, 0, from) + 1;
  const oldLines = countNewlines(scanned, from, oldEnd);
  return {
    from,
    oldEnd,
    delta: shown.length - scanned.length,
    fromLine,
    oldEndLine: fromLine + oldLines,
    lineDelta: countNewlines(shown, from, newEnd) - oldLines,
    fromAtLineStart: from === 0 || scanned.charCodeAt(from - 1) === 10,
    oldEndAtLineStart: oldEnd === 0 || scanned.charCodeAt(oldEnd - 1) === 10,
  };
}

/** Spans before the edit stay, spans after it move, spans it touched are dropped. */
export function shiftSpans<T extends { start: number; end: number }>(spans: readonly T[], edit: TextEdit | null): readonly T[] {
  if (!edit) return spans;
  const out: T[] = [];
  for (const span of spans) {
    if (span.end <= edit.from) out.push(span);
    else if (span.start >= edit.oldEnd) out.push({ ...span, start: span.start + edit.delta, end: span.end + edit.delta });
  }
  return out;
}

/**
 * Hints follow their line: a line that starts after the edit moves by the
 * lines it added or removed, a line that starts before it keeps its number,
 * and a line whose start the edit replaced is dropped.
 */
export function shiftLines<T>(byLine: ReadonlyMap<number, T>, edit: TextEdit | null): ReadonlyMap<number, T> {
  if (!edit || (!edit.lineDelta && edit.oldEndLine === edit.fromLine)) return byLine;
  const removedLines = edit.oldEndLine > edit.fromLine;
  const out = new Map<number, T>();
  for (const [line, value] of byLine) {
    if (line < edit.fromLine) out.set(line, value);
    else if (line === edit.fromLine) {
      if (edit.fromAtLineStart && edit.from === edit.oldEnd) out.set(line + edit.lineDelta, value);
      else if (!(edit.fromAtLineStart && removedLines)) out.set(line, value);
    } else if (line > edit.oldEndLine || (line === edit.oldEndLine && edit.oldEndAtLineStart)) {
      out.set(line + edit.lineDelta, value);
    }
  }
  return out;
}
