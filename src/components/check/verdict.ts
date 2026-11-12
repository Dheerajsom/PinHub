import type { CheckReport } from "@/lib/code-check/check";

// The report's one-line verdict and its tally. A verdict reads as all clear
// only when every reference the scanner found was matched to a pin, every
// matched pin is clear, and the whole input was checked. Values past the
// scanner's not-followed cap (`unfollowedDropped`) still count as unchecked,
// and code past its reference cap (`refsCapped`) reads like a cut paste.

export type VerdictTone = "fix" | "check" | "clear" | "none";

export type Verdict = { text: string; tone: VerdictTone };

export type TallyStatus = "fix" | "check" | "clear" | "missing" | "unfollowed";

export type TallyItem = { status: TallyStatus; count: number; text: string };

export type VerdictOptions = {
  /** Part of the input was cut before the scan, so the rest was not checked. */
  truncated?: boolean;
};

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

type Counted = Pick<CheckReport, "pins" | "missing" | "unfollowed" | "counts"> &
  Partial<Pick<CheckReport, "unfollowedDropped" | "refsCapped">>;

/** Every value the scanner could not follow, listed or past its cap. */
export function unfollowedCount(report: Counted): number {
  return report.unfollowed.length + Math.max(0, report.unfollowedDropped ?? 0);
}

export function headline(report: Counted, { truncated = false }: VerdictOptions = {}): Verdict {
  const matched = report.pins.length;
  const missing = report.missing.length;
  const unfollowed = unfollowedCount(report);
  const unchecked = missing + unfollowed;

  if (!matched) {
    if (!unchecked) return { text: "No pin references found", tone: "none" };
    return {
      text: unchecked === 1 ? "The pin reference could not be checked" : `None of the ${unchecked} pin references could be checked`,
      tone: "check",
    };
  }
  if (report.counts.fix) return { text: `${plural(report.counts.fix, "pin")} to fix`, tone: "fix" };
  if (report.counts.check) return { text: `${plural(report.counts.check, "pin")} to check`, tone: "check" };
  if (missing) return { text: `${plural(missing, "reference")} not matched to this board's record`, tone: "check" };
  if (unfollowed) return { text: `${plural(unfollowed, "value")} to check by hand`, tone: "check" };
  if (truncated || report.refsCapped) return { text: "Only part of the code was checked", tone: "check" };
  return { text: matched === 1 ? "The pin matches the record" : `All ${matched} pins match the record`, tone: "clear" };
}

/** Every count the verdict rests on, including the references it could not check. */
export function tally(report: Counted): TallyItem[] {
  const items: TallyItem[] = [
    { status: "fix", count: report.counts.fix, text: `${report.counts.fix} to fix` },
    { status: "check", count: report.counts.check, text: `${report.counts.check} to check` },
    { status: "clear", count: report.counts.clear, text: `${report.counts.clear} clear` },
  ];
  if (report.missing.length) {
    items.push({ status: "missing", count: report.missing.length, text: `${report.missing.length} not matched` });
  }
  const unfollowed = unfollowedCount(report);
  if (unfollowed) {
    items.push({ status: "unfollowed", count: unfollowed, text: `${unfollowed} not followed` });
  }
  return items;
}
