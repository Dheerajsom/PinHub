"use client";

import { clsx } from "clsx";
import type { PinAnchor } from "@/lib/board-visual-geometry";
import { roleChipStyles, roleLabels } from "@/components/board-visual/roles";

// Semantic, screen-reader-friendly detail block for the active pin. It is a
// stable aria-live region so selecting a pin announces its details without
// noisy chatter on incidental pointer movement (announcements fire on the
// pinned selection, not raw hover — see the parent's wiring).
export function PinDetails({
  anchor,
  pinned,
}: {
  anchor: PinAnchor | null;
  pinned: boolean;
}) {
  return (
    <div
      className="surface-well rounded-md px-3 py-2.5 text-sm"
      aria-live="polite"
    >
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
              className={clsx(
                "rounded border px-1.5 py-0.5 text-[11px] font-medium",
                roleChipStyles[anchor.pin.role],
              )}
            >
              {roleLabels[anchor.pin.role]}
            </span>
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
            <div className="rounded border border-orange-300/25 bg-orange-300/[0.06] px-2 py-1 text-[13px] leading-5 text-orange-100/90">
              {anchor.pin.note}
            </div>
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
