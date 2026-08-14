// Text layout for pad labels on the schematic (function-grouped) sheets, where
// a label is set underneath its pad inside a fixed column rather than out on a
// rail with room to run.
//
// The renderer and the build-time validation gate both import this, so the gate
// is checking the layout that actually gets drawn rather than an estimate of it.

/** Advance width of one character as a fraction of the font size. */
export const LABEL_CHAR_RATIO = 0.62;

/** Baseline-to-baseline step for stacked label lines, as a font-size multiple. */
export const LABEL_LINE_STEP = 1.15;

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Font size for a stacked label, scaled to the column it has to fit. */
export function stackedFontSize(pitch: number): number {
  return clamp(pitch / 7.2, 8.5, 14);
}

/**
 * Splits a pad label into the lines it is drawn on.
 *
 * "/" is the strongest break in these names — "18 / A4" is two alternative names
 * for one pin — so it is used first. Anything still too wide for the column is
 * then wrapped on whitespace, and a single word longer than the column is hard
 * broken. Nothing is ever dropped or ellipsised: this is a wiring reference, and
 * a truncated signal name is a name someone can misread.
 */
export function wrapStackedLabel(
  label: string,
  columnWidth: number,
  fontSize: number,
): string[] {
  const maxChars = Math.max(
    3,
    Math.floor((columnWidth * 0.94) / (fontSize * LABEL_CHAR_RATIO)),
  );
  const lines: string[] = [];

  const push = (line: string) => {
    let rest = line;
    while (rest.length > maxChars) {
      lines.push(rest.slice(0, maxChars));
      rest = rest.slice(maxChars);
    }
    if (rest) lines.push(rest);
  };

  for (const chunk of label.split("/").map((part) => part.trim()).filter(Boolean)) {
    let current = "";
    for (const word of chunk.split(/\s+/).filter(Boolean)) {
      const next = current ? `${current} ${word}` : word;
      if (next.length <= maxChars) {
        current = next;
        continue;
      }
      if (current) push(current);
      current = word;
    }
    if (current) push(current);
  }

  return lines;
}

/** Drawn size of a wrapped stacked label. */
export function stackedLabelExtent(
  lines: string[],
  fontSize: number,
): { width: number; height: number } {
  const chars = lines.reduce((n, line) => Math.max(n, line.length), 0);
  return {
    width: chars * fontSize * LABEL_CHAR_RATIO,
    height: fontSize * (1 + (lines.length - 1) * LABEL_LINE_STEP),
  };
}
