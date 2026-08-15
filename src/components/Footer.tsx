import Link from "next/link";
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
      <div className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-zinc-400 sm:px-6 lg:px-8">
        <span>
          Pinout data is community-compiled for reference only, provided
          &ldquo;as is&rdquo; without warranty. Always verify against the
          linked official documentation before wiring — PinHub and its
          contributors are not liable for hardware damage or other loss
          arising from its use.{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 transition hover:text-zinc-300"
          >
            Privacy
          </Link>
        </span>
        <span className="font-mono">
          {boards.length} boards · {sourceCount} source links
        </span>
      </div>
    </footer>
  );
}
