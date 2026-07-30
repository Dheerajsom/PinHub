"use client";

import { clsx } from "clsx";
import { TriangleAlert } from "lucide-react";
import type { PinAnchor } from "@/lib/board-visual-geometry";
import type { PinNet } from "@/lib/pin-nets";
import { netDescription } from "@/lib/pin-nets";
import { roleChipStyle, roleLabels } from "@/components/board-visual/roles";

// The probe readout: what the pin under the probe is, what net it sits on, and
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
    <div
      className="rounded-[3px] border border-[var(--pin-frame)] bg-[#0b1016] px-3 py-2.5"
      aria-live="polite"
    >
      {anchor ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            {/* Balloon: the pin's physical position, boxed the way a drawing
                calls out an item number. */}
            <span className="pin-tech grid h-6 min-w-6 place-items-center rounded-[3px] border border-[var(--pin-frame)] px-1 text-xs font-bold text-[var(--pin-probe)]">
              {anchor.pin.position}
            </span>
            <span className="pin-tech text-base font-bold leading-none text-white">
              {anchor.pin.label}
            </span>
            <span
              className="pin-tech rounded-[3px] border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em]"
              style={roleChipStyle(anchor.pin.role)}
            >
              {roleLabels[anchor.pin.role]}
            </span>
            {net && netSize > 1 ? (
              <span className="pin-tech rounded-[3px] border border-[var(--pin-probe)]/45 bg-[var(--pin-probe)]/[0.08] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--pin-probe)]">
                {netDescription(net)} · {netSize} pins
              </span>
            ) : null}
            {anchor.group ? (
              <span className="pin-eyebrow">{anchor.group}</span>
            ) : null}
            {pinned ? (
              <span className="pin-eyebrow ml-auto text-[var(--pin-probe)]/75">
                Held · Esc to release
              </span>
            ) : null}
          </div>

          {anchor.pin.aliases?.length ? (
            <div className="text-[12px] leading-4">
              <span className="pin-eyebrow">Also</span>{" "}
              <span className="pin-tech text-[var(--pin-rail)]">
                {anchor.pin.aliases.join("  ·  ")}
              </span>
            </div>
          ) : null}

          {anchor.pin.note ? (
            <p className="flex items-start gap-1.5 rounded-[3px] border border-orange-300/30 bg-orange-300/[0.07] px-2 py-1.5 text-[12px] leading-5 text-orange-100/90">
              <TriangleAlert
                className="mt-0.5 size-3.5 shrink-0 text-orange-300"
                aria-hidden="true"
              />
              <span className="min-w-0">{anchor.pin.note}</span>
            </p>
          ) : null}
        </div>
      ) : (
        <p className={clsx("pin-tech text-[12px] leading-5 text-[var(--pin-ink)]")}>
          Probe a pad to read its signal, net, and warnings. Arrow keys step
          through the connector.
        </p>
      )}
    </div>
  );
}
