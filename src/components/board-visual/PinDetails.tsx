"use client";

import { TriangleAlert } from "lucide-react";
import type { PinAnchor } from "@/lib/board-visual-geometry";
import type { PinNet } from "@/lib/pin-nets";
import { netDescription } from "@/lib/pin-nets";
import { roleChipStyle, roleLabels } from "@/components/board-visual/roles";

// The readout for the pin under the probe: what it is, what net it sits on, and
// anything about it that could damage hardware. Semantic and screen-reader
// friendly — a stable aria-live region, so selecting a pin announces its details
// without noisy chatter on incidental pointer movement (announcements fire on
// the pinned selection, not raw hover — see the parent's wiring).
export function PinDetails({
  anchor,
  pinned,
  net,
  netSize,
}: {
  anchor: PinAnchor | null;
  pinned: boolean;
  net: PinNet | null;
  /** How many pins on this connector share the net, including this one. */
  netSize: number;
}) {
  return (
    <div className="surface-well rounded-md px-3 py-2.5 text-sm" aria-live="polite">
      {anchor ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid h-6 min-w-6 place-items-center rounded bg-white/[0.06] px-1 font-mono text-xs font-semibold text-white">
              {anchor.pin.position}
            </span>
            <span className="font-mono text-base font-semibold text-white">
              {anchor.pin.label}
            </span>
            <span
              className="rounded border px-1.5 py-0.5 text-[11px] font-medium"
              style={roleChipStyle(anchor.pin.role)}
            >
              {roleLabels[anchor.pin.role]}
            </span>
            {net && netSize > 1 ? (
              <span className="rounded border border-cyan-300/45 bg-cyan-300/[0.08] px-1.5 py-0.5 text-[11px] font-medium text-cyan-100">
                {netDescription(net)} · {netSize} pins
              </span>
            ) : null}
            {anchor.group ? (
              <span className="text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                {anchor.group}
              </span>
            ) : null}
            {pinned ? (
              <span className="ml-auto text-[10px] uppercase tracking-[0.14em] text-cyan-300/80">
                Pinned · Esc to clear
              </span>
            ) : null}
          </div>

          {anchor.pin.aliases?.length ? (
            <div className="text-[13px] text-zinc-400">
              <span className="text-zinc-500">Aliases: </span>
              <span className="font-mono">{anchor.pin.aliases.join(" / ")}</span>
            </div>
          ) : null}

          {anchor.pin.note ? (
            <p className="flex items-start gap-1.5 rounded border border-orange-300/25 bg-orange-300/[0.06] px-2 py-1.5 text-[13px] leading-5 text-orange-100/90">
              <TriangleAlert
                className="mt-0.5 size-3.5 shrink-0 text-orange-300"
                aria-hidden="true"
              />
              <span className="min-w-0">{anchor.pin.note}</span>
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-zinc-500">
          Hover, tap, or focus a pad to inspect a pin. Use arrow keys to move
          between pins.
        </p>
      )}
    </div>
  );
}
