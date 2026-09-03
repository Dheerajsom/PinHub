import Link from "next/link";
import { SquareTerminal, Braces } from "lucide-react";
import { boards } from "@/lib/boards";

const sourceCount = boards.reduce(
  (total, board) => total + board.sourceLinks.length,
  0,
);

export function Footer() {
  return (
    <footer className="relative border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
      {/* zinc-400, not zinc-500: at 12 px on the #090b0f page ground, zinc-500
          (#71717b) measures 4.08:1 — under the 4.5:1 WCAG AA floor for normal
          text. This block carries the liability disclaimer and the Privacy
          link, so it is the last text on the site that should be hard to read.
          zinc-400 (#9f9fa9) measures 7.51:1. */}
      <div className="mx-auto grid max-w-[1560px] gap-3 px-4 py-5 text-xs sm:px-6 lg:grid-cols-[minmax(0,1.6fr)_auto_auto] lg:items-center lg:px-8">
        <span className="leading-5 text-zinc-400">
          Pinout data is community-compiled for reference only, provided
          &ldquo;as is&rdquo; without warranty. Always verify against the
          linked official documentation before wiring — PinHub and its
          contributors are not liable for hardware damage or other loss
          arising from its use.{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 transition hover:text-zinc-200"
          >
            Privacy
          </Link>
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <Link
            href="/compare"
            className="ph-quick-chip inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-zinc-400 hover:border-cyan-300/40 hover:text-cyan-100"
          >
            <SquareTerminal className="size-3" aria-hidden="true" />
            ph rpi5
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-zinc-500">
            <Braces className="size-3" aria-hidden="true" />
            /api/boards/[id]
          </span>
        </span>
        <span className="font-mono tabular-nums text-zinc-500">
          {boards.length} boards · {sourceCount} source links
        </span>
      </div>
    </footer>
  );
}
