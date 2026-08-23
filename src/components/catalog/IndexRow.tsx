"use client";

import { memo } from "react";
import { BadgeCheck, GitCompareArrows, Star, TriangleAlert } from "lucide-react";
import { clsx } from "clsx";
import type { BoardSummary } from "@/lib/board-summary";
import { matchFieldLabels, type BoardMatchField } from "@/lib/board-search";
import { VendorLogo } from "@/components/VendorLogo";

type IndexRowProps = {
  board: BoardSummary;
  /** 1-based position in the current result set, printed like a parts index. */
  ordinal: number;
  selected: boolean;
  /**
   * Whether this row's inline bench is open. Null on the two-pane layout, where
   * the row selects a board for the bench column instead of disclosing anything.
   */
  benchOpen: boolean | null;
  matchedBy: BoardMatchField | null;
  favorite: boolean;
  compared: boolean;
  compareFull: boolean;
  onSelect: (id: string) => void;
  onNavigate: (
    id: string,
    direction: "next" | "previous" | "first" | "last",
  ) => void;
  onPrefetch: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onToggleCompare: (id: string) => void;
};

/**
 * One line of the bench index.
 *
 * Dense by design: everything needed to tell two boards apart without opening
 * either — identity, class, logic level and 5 V tolerance, whether PinHub has a
 * mapped connector and how many pins are on it, how many wiring cautions apply,
 * and whether an official vendor source backs the entry.
 *
 * Selection is expressed the way a connector marks its first pin: a square
 * marker appears at the left edge and the surface steps up one tier. No colour
 * wash, no rail, no inserted element — so nothing reflows when selection moves.
 */
export const IndexRow = memo(function IndexRow({
  board,
  ordinal,
  selected,
  benchOpen,
  matchedBy,
  favorite,
  compared,
  compareFull,
  onSelect,
  onNavigate,
  onPrefetch,
  onToggleFavorite,
  onToggleCompare,
}: IndexRowProps) {
  const { discovery } = board;
  const notFiveVoltSafe = discovery.fiveVoltTolerance === "No";
  const compareDisabled = compareFull && !compared;

  return (
    <article
      id={`board-row-${board.id}`}
      className={clsx(
        "relative border-b border-rule transition-colors [contain-intrinsic-block-size:5.5rem] [content-visibility:auto]",
        selected ? "pin1 bg-raised" : "bg-face hover:bg-raised",
      )}
    >
      {/* One full-bleed hit target under the content, so the whole line selects
          the board while the star and compare controls stay independently
          clickable above it. */}
      <button
        id={`board-row-action-${board.id}`}
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
          benchOpen === null
            ? `Select ${board.name}`
            : benchOpen
              ? `Hide ${board.name} details`
              : `Show ${board.name} details`
        }
        {...(benchOpen === null
          ? { "aria-pressed": selected }
          : {
              "aria-expanded": benchOpen,
              "aria-controls": benchOpen ? "inline-bench" : undefined,
            })}
        className="absolute inset-0 z-0 outline-none focus-visible:outline focus-visible:-outline-offset-2"
      />

      <div className="pointer-events-none relative z-10 py-2 pl-6 pr-[4.5rem]">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="data shrink-0 text-[11px] text-faint" aria-hidden="true">
            {String(ordinal).padStart(3, "0")}
          </span>
          <VendorLogo vendor={board.vendor} size={14} />
          <h2 className="readout truncate text-[15px] uppercase text-ink">
            {board.name}
          </h2>
          <span className="chip">{board.category}</span>

          {board.hasPinout ? (
            <span
              className="chip"
              title={`${board.pinCount} pins mapped in PinHub`}
            >
              MAP {board.pinCount}
            </span>
          ) : (
            <span className="chip opacity-70" title="No in-app pin map; the entry links the vendor pinout instead">
              REF ONLY
            </span>
          )}

          {board.warningCount > 0 ? (
            <span
              className="chip chip-hazard"
              title={`${board.warningCount} wiring caution${board.warningCount === 1 ? "" : "s"}`}
            >
              <TriangleAlert className="size-2.5" aria-hidden="true" />
              {board.warningCount}
            </span>
          ) : null}

          {board.hasOfficialDocumentation ? (
            <span className="chip chip-verified" title="Backed by an official vendor source">
              <BadgeCheck className="size-2.5" aria-hidden="true" />
              OFFICIAL
            </span>
          ) : (
            <span className="chip opacity-70" title="No official vendor source; cross-check before wiring">
              3RD-PARTY
            </span>
          )}

          {matchedBy ? (
            <span className="chip">
              <span className="sr-only">Matched by {matchFieldLabels[matchedBy]}</span>
              <span aria-hidden="true">{matchFieldLabels[matchedBy]}↑</span>
            </span>
          ) : null}
        </div>

        <p className="mt-0.5 line-clamp-1 text-[13px] leading-snug text-dim">
          {board.description}
        </p>

        <div className="data mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-faint">
          <span className="text-dim">{board.vendor}</span>
          <span aria-hidden="true">·</span>
          <span>{board.processor}</span>
          <span aria-hidden="true">·</span>
          <span className={clsx(notFiveVoltSafe && "text-hazard-ink")}>
            {discovery.logicProfile}
            {notFiveVoltSafe ? " · not 5 V tolerant" : ""}
          </span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{board.interfaces.join(" ")}</span>
        </div>
      </div>

      {/* Row controls sit above the full-bleed hit target. */}
      <div className="absolute right-1 top-1.5 z-20 flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onToggleCompare(board.id)}
          disabled={compareDisabled}
          aria-pressed={compared}
          aria-label={
            compared
              ? `Remove ${board.name} from the comparison`
              : compareDisabled
                ? `Comparison is full; remove a board before adding ${board.name}`
                : `Add ${board.name} to the comparison`
          }
          title={
            compareDisabled
              ? "Comparison is full (4 boards)"
              : compared
                ? "In comparison"
                : "Add to comparison"
          }
          className={clsx(
            "grid size-8 place-items-center border transition-colors",
            compared
              ? "border-rule-strong bg-raised text-ink"
              : "border-transparent text-faint hover:border-rule hover:text-ink",
            compareDisabled && "cursor-not-allowed opacity-40 hover:border-transparent hover:text-faint",
          )}
        >
          <GitCompareArrows className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onToggleFavorite(board.id)}
          aria-pressed={favorite}
          aria-label={
            favorite
              ? `Remove ${board.name} from saved boards`
              : `Save ${board.name}`
          }
          title={favorite ? "Saved" : "Save"}
          className={clsx(
            "grid size-8 place-items-center border border-transparent transition-colors hover:border-rule",
            favorite ? "text-ink" : "text-faint hover:text-ink",
          )}
        >
          <Star
            className={clsx("size-3.5", favorite && "fill-current")}
            aria-hidden="true"
          />
        </button>
      </div>
    </article>
  );
});
