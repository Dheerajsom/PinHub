import Link from "next/link";
import { clsx } from "clsx";
import { Route } from "lucide-react";

/** The way from a board to its planner. Only render it for a board with a pin map. */
export function PlanPinsLink({
  boardId,
  className,
}: {
  boardId: string;
  className?: string;
}) {
  return (
    <Link
      href={`/planner?board=${encodeURIComponent(boardId)}`}
      className={clsx(
        "flex min-h-11 items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#15181f] px-3 py-2 text-sm text-zinc-300 transition hover:border-cyan-300/50 hover:bg-[#1c2029] hover:text-white sm:max-w-sm",
        className,
      )}
    >
      <span className="min-w-0 font-medium">Plan pins on this board</span>
      <Route className="size-4 shrink-0" aria-hidden="true" />
    </Link>
  );
}
