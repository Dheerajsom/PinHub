"use client";

import { useId, useState } from "react";
import { ArrowUpRight, BadgeCheck, ShieldAlert } from "lucide-react";
import { clsx } from "clsx";
import type { SourceLink } from "@/lib/boards";

type WiringCautionsProps = {
  warnings: readonly string[];
  /** The single most useful source for checking the physical map. */
  verifySource?: SourceLink;
  verifySourceOfficial?: boolean;
  /**
   * Show only this many warnings until expanded. Omit to always list every
   * warning (the standalone board page has the room; the catalog's side panel
   * keeps its pin map near the top).
   */
  collapseAfter?: number;
  className?: string;
};

/**
 * "Before you wire": a board's hardware cautions and the document to check
 * them against, as one unit. They used to be two separate cards — an orange
 * verify link above the pin map and a warning list far below it — although
 * both answer the same question an engineer asks before connecting anything.
 */
export function WiringCautions({
  warnings,
  verifySource,
  verifySourceOfficial = false,
  collapseAfter,
  className,
}: WiringCautionsProps) {
  const [expanded, setExpanded] = useState(false);
  const headingId = useId();
  const listId = useId();
  const limit =
    collapseAfter !== undefined && !expanded && warnings.length > collapseAfter + 1
      ? collapseAfter
      : warnings.length;
  const hidden = warnings.length - limit;

  if (!warnings.length && !verifySource) return null;

  return (
    <section
      aria-labelledby={headingId}
      className={clsx("ph-cautions min-w-0 rounded-xl", className)}
    >
      <div className="flex items-center gap-2.5 px-4 pt-3.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-md border border-orange-300/30 bg-orange-400/10">
          <ShieldAlert className="size-3.5 text-orange-200" aria-hidden="true" />
        </span>
        <h2
          id={headingId}
          className="text-[13px] font-semibold tracking-tight text-white"
        >
          Before you wire
        </h2>
        {warnings.length ? (
          <span className="ml-auto rounded-full bg-orange-400/10 px-2 py-0.5 font-mono text-[10px] tabular-nums text-orange-200">
            {warnings.length} {warnings.length === 1 ? "caution" : "cautions"}
          </span>
        ) : null}
      </div>

      {warnings.length ? (
        <ul
          id={listId}
          className="mt-2.5 space-y-2 px-4 text-[13px] leading-6 text-zinc-300"
        >
          {warnings.slice(0, limit).map((warning) => (
            <li key={warning} className="flex gap-2.5">
              <span
                className="mt-[0.6rem] h-px w-2.5 shrink-0 bg-orange-300/80"
                aria-hidden="true"
              />
              <span className="min-w-0">{warning}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {hidden > 0 || expanded ? (
        <div className="px-4">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls={listId}
            className="mt-1.5 inline-flex min-h-11 items-center text-xs font-medium text-orange-200 underline-offset-4 transition hover:text-orange-50 hover:underline"
          >
            {expanded
              ? "Show fewer cautions"
              : `Show ${hidden} more ${hidden === 1 ? "caution" : "cautions"}`}
          </button>
        </div>
      ) : (
        <div className="h-3.5" aria-hidden="true" />
      )}

      {verifySource ? (
        <a
          href={verifySource.url}
          target="_blank"
          rel="noopener noreferrer"
          // `relative` gives the visually hidden suffix a containing block
          // inside the link; without it that absolutely positioned text sat
          // past the truncated label and widened the page on phones.
          className="ph-cautions-verify group relative flex min-h-12 items-center justify-between gap-3 rounded-b-xl border-t px-4 py-2.5 text-sm transition"
        >
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-200/80">
              Verify against
            </span>
            <span className="mt-0.5 block truncate font-medium text-zinc-100">
              {verifySource.label}
            </span>
            <span className="sr-only"> (opens in a new tab)</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {verifySourceOfficial ? (
              <span className="flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-100">
                <BadgeCheck className="size-3" aria-hidden="true" />
                Official
              </span>
            ) : (
              <span
                className="rounded border border-white/15 bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-zinc-300"
                title="Not published by the board vendor — cross-check against vendor documentation"
              >
                3rd-party
              </span>
            )}
            <ArrowUpRight
              className="size-4 text-orange-200/70 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-orange-100"
              aria-hidden="true"
            />
          </span>
        </a>
      ) : null}
    </section>
  );
}
