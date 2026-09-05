import { memo, type ReactNode } from "react";
import Link from "next/link";
import { GitCompareArrows, Star, X } from "lucide-react";
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
      className="group flex shrink-0 items-center gap-1.5 rounded-full border border-cyan-300/50 bg-cyan-300/10 py-1 pl-2.5 pr-2 text-xs font-medium text-cyan-50 transition hover:border-cyan-300/80 hover:bg-cyan-300/15"
    >
      <span className="size-1.5 rounded-full bg-cyan-300" aria-hidden="true" />
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
    <section className="surface-panel rounded-xl p-3">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="grid size-7 shrink-0 place-items-center rounded-md border border-white/10 bg-[#0a0c11]">
          {icon}
        </span>
        <span className="text-[13px] font-semibold tracking-tight text-white">
          {title}
        </span>
        {active !== "All" ? (
          <span className="ml-auto size-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.8)]" aria-hidden="true" />
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-0.5">
        {items.map((item) => {
          const isActive = active === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              className={clsx(
                "flex min-h-10 items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[13px] transition lg:min-h-0 lg:py-[7px]",
                isActive
                  ? "border-cyan-300/60 bg-cyan-300/10 font-medium text-cyan-50 shadow-[inset_0_1px_0_rgba(103,232,249,0.12)]"
                  : "border-transparent text-zinc-400 hover:bg-white/[0.06] hover:text-white",
              )}
              aria-pressed={isActive}
            >
              <span className="flex min-w-0 items-center gap-2">
                {isActive ? (
                  <span className="size-1.5 shrink-0 rounded-full bg-cyan-300" aria-hidden="true" />
                ) : null}
                <span className="truncate">{item}</span>
              </span>
              {counts?.has(item) ? (
                <span
                  className={clsx(
                    "shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums",
                    isActive
                      ? "bg-cyan-300/15 text-cyan-100"
                      : "bg-white/[0.05] text-zinc-500",
                  )}
                >
                  {counts.get(item)}
                </span>
              ) : null}
            </button>
          );
        })}
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
  const hasValue = active !== "All";
  return (
    <label className="surface-panel block rounded-xl p-3">
      <span className="mb-2 flex items-center gap-2 px-1">
        <span className="grid size-7 shrink-0 place-items-center rounded-md border border-white/10 bg-[#0a0c11]">
          {icon}
        </span>
        <span className="text-[13px] font-semibold tracking-tight text-white">
          {title}
        </span>
        {hasValue ? (
          <span className="ml-auto size-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.8)]" aria-hidden="true" />
        ) : null}
      </span>
      <select
        value={active}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full cursor-pointer rounded-lg border border-white/10 bg-[#0a0c11] px-2.5 text-[13px] text-zinc-200 outline-none transition focus:border-cyan-300/60 hover:border-white/20"
      >
        {items.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
    </label>
  );
}

// Protocol-tinted interface chips. The tone key drives `.ph-iface[data-tone]`
// in globals.css (same hues as the pin-role system), which keeps both themes
// working — inline styles would bypass the light-mode rules entirely.
const interfaceTones: Record<string, string> = {
  GPIO: "gpio",
  I2C: "i2c",
  SPI: "spi",
  UART: "uart",
  ADC: "adc",
  DAC: "dac",
  PWM: "pwm",
  CAN: "can",
  USB: "usb",
  Ethernet: "ethernet",
  "Wi-Fi": "wifi",
  Bluetooth: "bluetooth",
};

function interfaceTone(item: string): string {
  return interfaceTones[item] ?? "default";
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
        "ph-row ph-card-in group relative rounded-xl border [contain-intrinsic-block-size:9rem] [content-visibility:auto]",
        selected
          ? "ph-row-selected border-cyan-300/40 shadow-[inset_0_1px_0_rgba(103,232,249,0.14),0_2px_4px_rgba(0,0,0,0.5),0_18px_44px_-18px_rgba(34,211,238,0.35)]"
          : "border-white/10 shadow-[0_1px_2px_rgba(0,0,0,0.4),0_12px_30px_-20px_rgba(0,0,0,0.85)] hover:border-cyan-300/25",
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
        className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0e13]"
      />
      <div className="pointer-events-none relative z-10 p-4">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 pr-20">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-[#0a0c11] text-sm font-bold text-zinc-300">
              <VendorLogo vendor={board.vendor} size={20} />
              <span className="hidden only:inline" aria-hidden="true">
                {board.name.charAt(0)}
              </span>
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <h2 className="truncate text-[15px] font-semibold tracking-tight text-white">{board.name}</h2>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="rounded border border-white/10 bg-[#0a0c11] px-1.5 py-px text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-400">
                  {board.category}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-500">
                  {board.vendor} · {board.logicLevel}
                </span>
                {matchedBy ? (
                  <span className="shrink-0 rounded border border-cyan-300/25 bg-cyan-300/[0.07] px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.1em] text-cyan-200/90">
                    <span className="sr-only">
                      Matched by {matchFieldLabels[matchedBy]}
                    </span>
                    <span aria-hidden="true">
                      {matchFieldLabels[matchedBy]} match
                    </span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <p
          className={clsx(
            "mt-2 line-clamp-2 text-[13px] leading-6 transition",
            selected ? "text-zinc-200" : "text-zinc-400",
          )}
        >
          {board.description}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {board.interfaces.slice(0, 7).map((item) => (
            <span
              key={item}
              data-tone={interfaceTone(item)}
              className="ph-iface"
            >
              {item}
            </span>
          ))}
          {board.interfaces.length > 7 ? (
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[11px] text-zinc-400">
              +{board.interfaces.length - 7}
            </span>
          ) : null}
          <span className="ml-auto hidden font-mono text-[11px] text-zinc-600 md:inline" aria-hidden="true">
            {board.processor}
          </span>
        </div>
      </div>
      <Link
        href={`/compare?boards=${encodeURIComponent(board.id)}`}
        aria-label={`Compare ${board.name}`}
        title="Compare board"
        className="absolute right-11 top-2.5 z-20 grid size-9 place-items-center rounded-lg border border-transparent text-zinc-600 transition hover:border-cyan-300/30 hover:bg-white/[0.08] hover:text-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-300/70"
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
        className={clsx(
          "absolute right-2 top-2.5 z-20 grid size-9 place-items-center rounded-lg border transition",
          favorite
            ? "ph-fav-active border-amber-300/50 bg-amber-300/15 text-amber-300 hover:bg-amber-300/20"
            : "border-transparent text-zinc-600 hover:border-white/10 hover:bg-white/[0.08] hover:text-amber-200",
        )}
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
