import { memo, type ReactNode } from "react";
import Link from "next/link";
import { CircuitBoard, GitCompareArrows, ShieldAlert, Star, X } from "lucide-react";
import { clsx } from "clsx";
import type { BoardSummary } from "@/lib/board-summary";
import {
  matchFieldLabels,
  type BoardMatchField,
} from "@/lib/board-search";
import { VendorLogo } from "@/components/VendorLogo";

type ActiveFilterChipProps = {
  label: string;
  onClear: () => void;
};

export function ActiveFilterChip({ label, onClear }: ActiveFilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label={`Remove ${label} filter`}
      className="group flex items-center gap-1.5 rounded-md border border-cyan-300/50 bg-cyan-300/10 px-2 py-1 text-xs text-cyan-50 transition hover:border-cyan-300/80"
    >
      {label}
      <X
        className="size-3 text-cyan-200/70 transition group-hover:text-white"
        aria-hidden="true"
      />
    </button>
  );
}

type FilterPanelProps = {
  title: string;
  icon: ReactNode;
  items: readonly string[];
  active: string;
  counts?: Map<string, number>;
  onChange: (value: string) => void;
};

export function FilterPanel({
  title,
  icon,
  items,
  active,
  counts,
  onChange,
}: FilterPanelProps) {
  return (
    <section className="surface-panel rounded-lg p-3">
      <div className="mb-2.5 flex items-center gap-2 px-1 text-sm font-semibold text-white">
        {icon}
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-1">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={clsx(
              "flex min-h-10 items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-sm transition lg:min-h-0",
              active === item
                ? "border-cyan-300/70 bg-cyan-300/10 text-cyan-50"
                : "border-transparent text-zinc-400 hover:bg-white/[0.06] hover:text-white",
            )}
            aria-pressed={active === item}
          >
            <span>{item}</span>
            {counts?.has(item) ? (
              <span className="font-mono text-xs text-zinc-500">
                {counts.get(item)}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}

type FilterSelectProps = {
  title: string;
  icon: ReactNode;
  items: readonly string[];
  active: string;
  onChange: (value: string) => void;
};

export function FilterSelect({
  title,
  icon,
  items,
  active,
  onChange,
}: FilterSelectProps) {
  return (
    <label className="surface-panel block rounded-lg p-3">
      <span className="mb-2.5 flex items-center gap-2 px-1 text-sm font-semibold text-white">
        {icon}
        {title}
      </span>
      <select
        value={active}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-white/10 bg-[#0a0c11] px-2.5 text-sm text-zinc-200 outline-none focus:border-cyan-300/60"
      >
        {items.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
  );
}

type BoardResultProps = {
  board: BoardSummary;
  selected: boolean;
  /**
   * Whether this row's inline detail is open. Null on the desktop layout,
   * where the row selects a board for the side column instead of disclosing
   * anything.
   */
  detailOpen: boolean | null;
  /** Field that put this board in the results; null when nothing is typed. */
  matchedBy: BoardMatchField | null;
  favorite: boolean;
  onSelect: (id: string) => void;
  onNavigate: (
    id: string,
    direction: "next" | "previous" | "first" | "last",
  ) => void;
  onPrefetch: (id: string) => void;
  onToggleFavorite: (id: string) => void;
};

// Memoized with stable callbacks so a keystroke, selection change, or favorite
// toggle only re-renders the rows whose props actually changed, not the whole
// catalog. content-visibility lets the browser skip layout/paint for rows far
// off screen, which keeps scrolling smooth on phones and low-end machines.
export const BoardResult = memo(function BoardResult({
  board,
  selected,
  detailOpen,
  matchedBy,
  favorite,
  onSelect,
  onNavigate,
  onPrefetch,
  onToggleFavorite,
}: BoardResultProps) {
  return (
    <article
      id={`board-result-${board.id}`}
      className={clsx(
        // The selected row powers on rather than wearing a marker. On a bench
        // the instrument in use is the one that is lit, so selection raises
        // this row out of the board — lighter surface, light caught on the top
        // edge, deeper shadow — and brings its contents up to full contrast
        // (see `selected` below on the description, chips, and meta). No rail,
        // no badge, no added element: the border stays a uniform hairline on
        // all four sides in both states, which is also why nothing reflows.
        // Contrast ratios compress badly this close to black, so the surface
        // step is sized in perceptual lightness (~11 L*) rather than by ratio.
        "relative rounded-lg border [contain-intrinsic-block-size:9rem] [content-visibility:auto] transition",
        selected
          ? "border-white/25 bg-[#262c3a] shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_2px_4px_rgba(0,0,0,0.5),0_18px_40px_-18px_rgba(0,0,0,0.95)]"
          : "border-white/10 bg-[#14161d] shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_30px_-20px_rgba(0,0,0,0.85)] hover:border-white/20 hover:bg-[#191c24]",
      )}
    >
      <button
        id={`board-result-action-${board.id}`}
        type="button"
        onClick={() => onSelect(board.id)}
        onKeyDown={(event) => {
          const direction =
            event.key === "ArrowDown"
              ? "next"
              : event.key === "ArrowUp"
                ? "previous"
                : event.key === "Home"
                  ? "first"
                  : event.key === "End"
                    ? "last"
                    : null;
          if (!direction) return;
          event.preventDefault();
          onNavigate(board.id, direction);
        }}
        onPointerEnter={() => onPrefetch(board.id)}
        onFocus={() => onPrefetch(board.id)}
        aria-label={
          detailOpen === null
            ? `Select ${board.name}`
            : detailOpen
              ? `Hide ${board.name} details`
              : `Show ${board.name} details`
        }
        // Two layouts, two roles for the same control: on lg+ it selects the
        // board for the persistent detail column; below that it discloses the
        // detail inline underneath the row.
        {...(detailOpen === null
          ? { "aria-pressed": selected }
          : {
              "aria-expanded": detailOpen,
              "aria-controls": detailOpen ? "mobile-board-detail" : undefined,
            })}
        className="absolute inset-0 z-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0e13]"
      />
      <div className="pointer-events-none relative z-10 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pr-20">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <VendorLogo vendor={board.vendor} />
            <h2 className="text-base font-semibold text-white">{board.name}</h2>
            <span
              className={clsx(
                "rounded border bg-[#0a0c11] px-1.5 py-0.5 text-[11px] transition",
                selected
                  ? "border-white/20 text-zinc-100"
                  : "border-white/10 text-zinc-300",
              )}
            >
              {board.category}
            </span>
            {board.hasPinout ? (
              <span className="flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-400/10 px-1.5 py-0.5 text-[11px] text-emerald-100">
                <CircuitBoard className="size-3" aria-hidden="true" />
                Pin map
              </span>
            ) : null}
            {board.warningCount > 0 ? (
              <span
                className="flex items-center gap-1 rounded border border-orange-300/40 bg-orange-400/10 px-1.5 py-0.5 text-[11px] text-orange-100"
                title={`${board.warningCount} wiring caution${board.warningCount === 1 ? "" : "s"} — see “Check before wiring”`}
              >
                <ShieldAlert className="size-3" aria-hidden="true" />
                {board.warningCount}
              </span>
            ) : null}
          </div>
          <span className="flex min-w-0 items-center gap-2">
            {matchedBy ? (
              <span className="shrink-0 rounded border border-cyan-300/25 bg-cyan-300/[0.07] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-cyan-200/90">
                <span className="sr-only">
                  Matched by {matchFieldLabels[matchedBy]}
                </span>
                <span aria-hidden="true">
                  {matchFieldLabels[matchedBy]} match
                </span>
              </span>
            ) : null}
            <span
              className={clsx(
                "min-w-0 break-words font-mono text-xs transition sm:text-right",
                selected ? "text-zinc-300" : "text-zinc-500",
              )}
            >
              {board.vendor} · {board.logicLevel}
            </span>
          </span>
        </div>

        <p
          className={clsx(
            "mt-1.5 line-clamp-2 text-sm leading-6 transition",
            selected ? "text-zinc-200" : "text-zinc-400",
          )}
        >
          {board.description}
        </p>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {board.interfaces.slice(0, 7).map((item) => (
            <span
              key={item}
              className={clsx(
                "rounded border px-1.5 py-0.5 text-[11px] transition",
                selected
                  ? "border-white/20 bg-[#0f1218] text-zinc-100"
                  : "border-white/10 bg-zinc-950 text-zinc-300",
              )}
            >
              {item}
            </span>
          ))}
          {board.interfaces.length > 7 ? (
            <span
              className={clsx(
                "rounded border px-1.5 py-0.5 text-[11px] transition",
                selected
                  ? "border-white/20 bg-[#0f1218] text-zinc-300"
                  : "border-white/10 bg-zinc-950 text-zinc-500",
              )}
            >
              +{board.interfaces.length - 7}
            </span>
          ) : null}
        </div>
      </div>
      <Link
        href={`/compare?boards=${encodeURIComponent(board.id)}`}
        aria-label={`Compare ${board.name}`}
        title="Compare board"
        className="absolute right-12 top-1 z-20 grid size-11 place-items-center rounded-md text-zinc-500 transition hover:bg-white/[0.08] hover:text-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-300/70"
      >
        <GitCompareArrows className="size-4" aria-hidden="true" />
      </Link>
      <button
        type="button"
        onClick={() => onToggleFavorite(board.id)}
        aria-label={
          favorite
            ? `Remove ${board.name} from favorites`
            : `Add ${board.name} to favorites`
        }
        aria-pressed={favorite}
        title={favorite ? "Remove from favorites" : "Add to favorites"}
        className="absolute right-1 top-1 z-20 grid size-11 place-items-center rounded-md text-zinc-500 transition hover:bg-white/[0.08] hover:text-amber-200"
      >
        <Star
          className={clsx(
            "size-4",
            favorite && "fill-amber-300 text-amber-300",
          )}
          aria-hidden="true"
        />
      </button>
    </article>
  );
});
