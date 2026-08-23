"use client";

import { useId, useState } from "react";
import { ChevronRight } from "lucide-react";
import { clsx } from "clsx";

export type FacetValue = {
  value: string;
  /** How many boards would remain if this value were added to the selection. */
  count: number;
};

type FacetGroupProps = {
  legend: string;
  values: FacetValue[];
  selected: readonly string[];
  onToggle: (value: string) => void;
  /** Groups past the primary three start closed to keep the index above the fold. */
  defaultOpen?: boolean;
  /** Explains how multiple ticks in this group combine. */
  hint?: string;
};

/**
 * One engraved facet group on the left fascia.
 *
 * Values that would yield nothing are shown disabled with their zero rather
 * than hidden: hiding them tells the user the option does not exist, when in
 * fact it is only unreachable from where they currently are.
 */
export function FacetGroup({
  legend,
  values,
  selected,
  onToggle,
  defaultOpen = true,
  hint,
}: FacetGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  if (!values.length) return null;

  const activeCount = selected.length;

  return (
    <section className="border-b border-rule last:border-b-0">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex w-full items-center gap-1.5 px-3 py-2 text-left transition-colors hover:bg-raised"
        >
          <ChevronRight
            className={clsx(
              "size-3 shrink-0 text-faint transition-transform",
              open && "rotate-90",
            )}
            aria-hidden="true"
          />
          <span className="silk flex-1 text-dim">{legend}</span>
          {activeCount ? (
            <span className="data text-[11px] text-ink">{activeCount}</span>
          ) : null}
        </button>
      </h3>

      <div id={bodyId} hidden={!open} className="pb-1.5">
        {hint ? <p className="px-3 pb-1 text-[11px] text-faint">{hint}</p> : null}
        <ul>
          {values.map((entry) => {
            const checked = selected.includes(entry.value);
            const unreachable = entry.count === 0 && !checked;
            return (
              <li key={entry.value}>
                <label
                  className={clsx(
                    "flex cursor-pointer items-center gap-2 px-3 py-1 transition-colors",
                    unreachable
                      ? "cursor-not-allowed opacity-45"
                      : "hover:bg-raised",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={unreachable}
                    onChange={() => onToggle(entry.value)}
                    className="size-3.5 shrink-0 accent-[var(--legend-ink)]"
                  />
                  <span
                    className={clsx(
                      "min-w-0 flex-1 truncate text-[13px]",
                      checked ? "text-ink" : "text-dim",
                    )}
                  >
                    {entry.value}
                  </span>
                  <span className="data shrink-0 text-[11px] text-faint">
                    {entry.count}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

type FacetSwitchProps = {
  legend: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
};

/** A single on/off constraint, e.g. "only boards with an in-app pin map". */
export function FacetSwitch({
  legend,
  description,
  checked,
  onChange,
}: FacetSwitchProps) {
  return (
    <label className="flex cursor-pointer items-start gap-2 border-b border-rule px-3 py-2 transition-colors last:border-b-0 hover:bg-raised">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-3.5 shrink-0 accent-[var(--legend-ink)]"
      />
      <span className="min-w-0">
        <span
          className={clsx(
            "block text-[13px]",
            checked ? "text-ink" : "text-dim",
          )}
        >
          {legend}
        </span>
        <span className="block text-[11px] leading-snug text-faint">
          {description}
        </span>
      </span>
    </label>
  );
}
