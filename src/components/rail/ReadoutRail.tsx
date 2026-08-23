"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Copy, Search, X } from "lucide-react";
import type { Board } from "@/lib/boards";
import {
  flattenBoardPins,
  netMembers,
  pinMatchesQuery,
  pinSummaryText,
} from "@/lib/board-pins";
import { netDescription } from "@/lib/pin-nets";
import {
  pinAccessibleLabel,
  roleColors,
  roleLabels,
} from "@/components/board-visual/roles";

/**
 * THE READOUT RAIL — PinHub's signature instrument.
 *
 * A 1:1 flattened strip of the board's own header. Each pad is square, coloured
 * by pin role, and sits in physical order with pin 1 marked the way it is on
 * every real connector. To its left is the readout: the probed pin's position,
 * signal, role, aliases, net, and note.
 *
 * It is three things at once — the pin map, the navigation control, and the
 * answer — and it stays docked while the rest of the page scrolls, so "what pin
 * is that?" is answerable at any scroll depth without losing your place.
 *
 * Accessibility: the pads are a single composite widget. The rail is a
 * `listbox`, each pad an `option`, and it uses a roving tabindex — one tab stop
 * for the whole connector, then arrow keys to walk it, Home/End for the ends.
 * The readout is an `aria-live` region, so probing a pad speaks its full
 * description without the pad labels being read one by one.
 *
 * Probe and search state is per-connector, so the wrapper remounts this on a
 * board change rather than clearing state from an effect.
 */
function ReadoutRailForBoard({ board }: { board: Board }) {
  const pins = useMemo(() => flattenBoardPins(board), [board]);
  const [probedIndex, setProbedIndex] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const probed = probedIndex === null ? null : (pins[probedIndex] ?? null);
  const onNet = useMemo(() => netMembers(pins, probed), [pins, probed]);
  const matches = useMemo(() => {
    if (!query.trim()) return null;
    return new Set(
      pins.filter((entry) => pinMatchesQuery(entry, query)).map((e) => e.index),
    );
  }, [pins, query]);

  const focusPad = useCallback((index: number) => {
    railRef.current
      ?.querySelector<HTMLElement>(`[data-pad-index="${index}"]`)
      ?.focus();
  }, []);

  const move = useCallback(
    (from: number, delta: number | "first" | "last") => {
      if (!pins.length) return;
      const next =
        delta === "first"
          ? 0
          : delta === "last"
            ? pins.length - 1
            : Math.min(Math.max(from + delta, 0), pins.length - 1);
      setProbedIndex(next);
      focusPad(next);
    },
    [focusPad, pins.length],
  );

  const copyPin = useCallback(async () => {
    if (!probed) return;
    try {
      await navigator.clipboard.writeText(pinSummaryText(board, probed));
      setCopied(true);
    } catch {
      // Clipboard can be blocked by permissions or an insecure context. Saying
      // nothing would look like the button did nothing, so fall through to the
      // same reset and leave the label unchanged rather than claiming success.
      setCopied(false);
    }
  }, [board, probed]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!pins.length) {
    return (
      <div className="border-t border-rule bg-face px-4 py-2.5 sm:px-6">
        <p className="text-xs text-dim">
          <span className="silk mr-2">No pin map</span>
          {board.name} is in the catalog but its connector is not mapped in
          PinHub yet. The linked vendor documentation below carries the
          authoritative pinout.
        </p>
      </div>
    );
  }

  // The tab stop follows the probe; before anything is probed it sits on pin 1.
  const tabbableIndex = probedIndex ?? 0;

  return (
    <section
      aria-label={`${board.name} pin rail`}
      data-print="hide"
      className="border-t border-rule bg-face"
    >
      <div className="mx-auto flex max-w-[1720px] flex-col gap-2 px-4 py-2 sm:px-6 lg:flex-row lg:items-center lg:gap-5">
        {/* ---- The readout window ---------------------------------------- */}
        <div
          className="well flex min-h-[3.25rem] min-w-0 shrink-0 items-center gap-3 px-3 py-1.5 lg:w-[21rem]"
          role="status"
          aria-live="polite"
        >
          {probed ? (
            <>
              <span
                className="data grid size-9 shrink-0 place-items-center border text-sm font-semibold"
                style={{
                  color: roleColors[probed.pin.role].ink,
                  backgroundColor: roleColors[probed.pin.role].wash,
                  borderColor: roleColors[probed.pin.role].edge,
                }}
                aria-hidden="true"
              >
                {probed.pin.position}
              </span>
              <span className="min-w-0 flex-1">
                <span className="readout block truncate text-lg text-ink">
                  {probed.pin.label}
                </span>
                <span className="block truncate text-[11px] text-dim">
                  {roleLabels[probed.pin.role]}
                  {probed.net ? ` · ${netDescription(probed.net)}` : ""}
                  {probed.pin.aliases?.length
                    ? ` · ${probed.pin.aliases.join(" / ")}`
                    : ""}
                </span>
                <span className="sr-only">
                  {pinAccessibleLabel(probed.pin)}
                  {onNet.size > 1
                    ? `. ${onNet.size} pins on this net.`
                    : ""}
                </span>
              </span>
              <button
                type="button"
                onClick={copyPin}
                className="ctl aspect-square !min-h-8 !px-0"
                aria-label={`Copy pin ${probed.pin.position} details`}
              >
                {copied ? (
                  <Check className="size-3.5 text-verified" aria-hidden="true" />
                ) : (
                  <Copy className="size-3.5" aria-hidden="true" />
                )}
              </button>
            </>
          ) : (
            <span className="text-xs leading-snug text-dim">
              <span className="silk mr-1.5">Readout</span>
              Point at a pad, or press Tab then the arrow keys, to read a pin.
            </span>
          )}
        </div>

        {/* ---- The connector ---------------------------------------------- */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="silk truncate">
              {board.pinout?.connector ?? "Connector"} · {pins.length} pins
            </span>
            <label className="flex items-center gap-1.5">
              <Search className="size-3 text-faint" aria-hidden="true" />
              <span className="sr-only">Find a pin on {board.name}</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setQuery("");
                }}
                placeholder="find pin"
                className="w-24 border-b border-rule bg-transparent pb-0.5 text-xs text-ink outline-none placeholder:text-faint focus-visible:border-ink sm:w-32"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear pin search"
                  className="text-faint transition-colors hover:text-ink"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              ) : null}
            </label>
          </div>

          <div
            ref={railRef}
            id={listId}
            role="listbox"
            aria-label={`${board.name} pins in physical order`}
            aria-orientation="horizontal"
            className="rail"
          >
            {pins.map((entry) => {
              const role = roleColors[entry.pin.role];
              const isProbed = entry.index === probedIndex;
              // A search dims what does not match rather than removing it — the
              // pad's position on the connector is half the answer.
              const dimmed = matches ? !matches.has(entry.index) : false;
              return (
                <button
                  key={entry.index}
                  type="button"
                  role="option"
                  aria-selected={isProbed}
                  data-pad-index={entry.index}
                  data-probed={isProbed}
                  data-on-net={onNet.has(entry.index)}
                  data-dimmed={dimmed}
                  data-first={entry.pin.position === 1}
                  tabIndex={entry.index === tabbableIndex ? 0 : -1}
                  onFocus={() => setProbedIndex(entry.index)}
                  onPointerEnter={() => setProbedIndex(entry.index)}
                  onClick={() => setProbedIndex(entry.index)}
                  onKeyDown={(event) => {
                    const key = event.key;
                    if (key === "ArrowRight") move(entry.index, 1);
                    else if (key === "ArrowLeft") move(entry.index, -1);
                    else if (key === "Home") move(entry.index, "first");
                    else if (key === "End") move(entry.index, "last");
                    else return;
                    event.preventDefault();
                  }}
                  aria-label={pinAccessibleLabel(entry.pin)}
                  className="rail-pad py-1.5"
                  style={{
                    backgroundColor: role.fill,
                    borderColor: role.edge,
                    color: role.ink,
                  }}
                >
                  <span aria-hidden="true">{entry.pin.position}</span>
                </button>
              );
            })}
          </div>

          {matches ? (
            <p className="mt-1 text-[11px] text-dim" role="status">
              {matches.size
                ? `${matches.size} of ${pins.length} pins match “${query}”.`
                : `No pin on this connector matches “${query}”. Try a signal name, an alias, or a pin number.`}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * A different board is a different connector, and none of the probe state means
 * anything across that boundary — so the rail is keyed by board id and starts
 * clean instead of being reset after the fact.
 */
export function ReadoutRail({ board }: { board: Board }) {
  return <ReadoutRailForBoard key={board.id} board={board} />;
}
