import Link from "next/link";
import { boards } from "@/lib/boards";

const sourceCount = boards.reduce(
  (total, board) => total + board.sourceLinks.length,
  0,
);

/**
 * The instrument's rating plate: the legal disclaimer, the privacy link, and
 * the catalog's size, set small at the very bottom edge the way a compliance
 * label is printed on the underside of a piece of equipment.
 */
export function Footer() {
  return (
    <footer className="relative z-10 border-t border-rule pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-[1720px] flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 py-4 text-xs text-dim sm:px-6">
        <p className="max-w-3xl">
          Pinout data is community-compiled for reference only, provided
          &ldquo;as is&rdquo; without warranty. Always verify against the linked
          official documentation before wiring — PinHub and its contributors are
          not liable for hardware damage or other loss arising from its use.{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 transition hover:text-ink"
          >
            Privacy
          </Link>
        </p>
        <p className="data text-faint">
          {boards.length} boards · {sourceCount} source links
        </p>
      </div>
    </footer>
  );
}
