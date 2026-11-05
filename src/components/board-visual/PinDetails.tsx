"use client";

import { ArrowUpRight, BadgeCheck, Flag, Waypoints, X } from "lucide-react";
import type { SourceLink } from "@/lib/boards";
import type { PinAnchor } from "@/lib/board-visual-geometry";
import type { PinNet } from "@/lib/pin-nets";
import { netDescription } from "@/lib/pin-nets";
import { pinReportUrl, type PinReportContext } from "@/lib/pin-report";
import { roleChipStyle, roleColors, roleLabels } from "@/components/board-visual/roles";
import { CopyPinButton } from "@/components/CopyPinButton";
import { PinCautions } from "@/components/board-visual/PinCautions";
import type { PinFlagNotes } from "@/lib/pin-reference";

export type PinoutSource = SourceLink & {
  provenance: "official" | "third-party";
};

// The readout for the pin under the probe: what it is, what net it sits on, and
// anything about it that could damage hardware. Semantic and screen-reader
// friendly — a stable aria-live region, so selecting a pin announces its details
// without noisy chatter on incidental pointer movement (announcements fire on
// the pinned selection, not raw hover — see the parent's wiring).
//
// Layout: an eyebrow (connector group) over the physical position set large,
// the signal name and its aliases beside it, then the net and any caution. The
// left rule takes the pin's role hue so the card matches the pad it describes.
// Actions only appear once a pin is pinned.
export function PinDetails({
  anchor,
  pinned,
  net,
  netSize,
  source,
  report,
  onClear,
  flagNotes,
}: {
  anchor: PinAnchor | null;
  pinned: boolean;
  net: PinNet | null;
  /** How many pins on this connector share the net, including this one. */
  netSize: number;
  source?: PinoutSource;
  /** Board, connector, and cited source for the "Report" link on a pinned pin. */
  report?: PinReportContext;
  /** Clears the pinned pin; renders a Clear action while a pin is pinned. */
  onClear?: () => void;
  flagNotes?: PinFlagNotes;
}) {
  const reportUrl =
    anchor && pinned && report
      ? pinReportUrl({
          ...report,
          pin: { ...anchor.pin, group: anchor.group },
        })
      : null;

  return (
    <div
      className="pin-readout surface-well overflow-hidden rounded-md text-sm"
      style={anchor ? { borderLeftColor: roleColors[anchor.pin.role].edge } : undefined}
      aria-live={pinned ? "polite" : "off"}
    >
      <div className="px-4 py-3.5">
        <div className="flex min-h-6 items-center justify-between gap-3">
          <span className="min-w-0 truncate text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
            {anchor?.group ? `Pin · ${anchor.group}` : "Pin"}
          </span>
          {anchor ? (
            <span
              className="shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-medium"
              style={roleChipStyle(anchor.pin.role)}
            >
              {roleLabels[anchor.pin.role]}
            </span>
          ) : null}
        </div>

        {anchor ? (
          <>
            <div className="mt-1.5 flex min-w-0 items-start gap-3.5">
              <span className="font-mono text-[2rem] font-light leading-none tabular-nums text-white">
                {anchor.pin.position}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="font-mono text-base font-semibold leading-tight break-words text-white">
                  {anchor.pin.label}
                </p>
                {anchor.pin.aliases?.length ? (
                  <p className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 font-mono text-xs leading-snug text-zinc-400">
                    <span className="sr-only">Also: </span>
                    {anchor.pin.aliases.map((alias, index) => (
                      <span key={`${index}-${alias}`} className="min-w-0 break-words">
                        {alias}
                        {index < anchor.pin.aliases!.length - 1 ? (
                          <span className="sr-only">, </span>
                        ) : null}
                      </span>
                    ))}
                  </p>
                ) : null}
              </div>
            </div>

            {net && netSize > 1 ? (
              <p className="mt-3.5 flex items-center gap-2 text-xs text-zinc-400">
                <Waypoints className="size-3.5 shrink-0 text-cyan-300/80" aria-hidden="true" />
                <span className="min-w-0">
                  {netDescription(net)}
                  <span className="text-zinc-500"> · {netSize} pins</span>
                </span>
              </p>
            ) : null}

            <PinCautions pin={anchor.pin} flagNotes={flagNotes} />
          </>
        ) : (
          <p className="mt-1.5 flex items-center gap-3.5 text-[13px] leading-5 text-zinc-500">
            <span className="font-mono text-[2rem] font-light leading-none text-zinc-600" aria-hidden="true">
              —
            </span>
            Select a pin to inspect its details.
          </p>
        )}
      </div>

      {anchor && pinned ? (
        <div className="pin-readout-actions">
          <CopyPinButton pin={anchor.pin} flagNotes={flagNotes} withLabel />
          {reportUrl ? (
            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Report an error in pin ${anchor.pin.position} ${anchor.pin.label} (opens GitHub in a new tab)`}
              title="Report an error in this pin on GitHub"
              className="pin-action"
            >
              <Flag className="size-3.5" aria-hidden="true" />
              Report
            </a>
          ) : null}
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear selection"
              title="Clear selection (Esc)"
              className="pin-action pin-action-end"
            >
              <X className="size-3.5" aria-hidden="true" />
              Clear
            </button>
          ) : null}
        </div>
      ) : null}

      {source ? (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${source.provenance} ${source.type.toLowerCase()} source: ${source.label}`}
          className="pin-readout-source flex min-h-11 min-w-0 items-center gap-2 px-4 text-[11px] text-zinc-400 transition hover:text-cyan-100"
        >
          {source.provenance === "official" ? (
            <BadgeCheck
              className="size-3.5 shrink-0 text-emerald-300"
              aria-hidden="true"
            />
          ) : (
            <ArrowUpRight
              className="size-3.5 shrink-0 text-zinc-500"
              aria-hidden="true"
            />
          )}
          <span className="min-w-0 truncate">{source.label}</span>
          <span className="ml-auto shrink-0 text-[10px] uppercase tracking-[0.1em] text-zinc-500">
            {source.provenance === "official" ? "Official" : "3rd-party"}
          </span>
        </a>
      ) : null}
    </div>
  );
}
