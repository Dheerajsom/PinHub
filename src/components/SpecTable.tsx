import { clsx } from "clsx";
import type { Board } from "@/lib/boards";
import { fiveVoltCaution } from "@/lib/board-utilities";

/**
 * The four characteristics people check first, as a ruled key/value table
 * like a datasheet's front page. Shared by the catalog panel and the board
 * page so the two never describe a board differently.
 */
export function SpecTable({ board, className }: { board: Board; className?: string }) {
  return (
    <dl className={clsx("ph-spec-table", className)}>
      <SpecRow label="Processor" value={board.processor} />
      <SpecRow label="Logic" value={board.logicLevel} caution={fiveVoltCaution(board)} />
      <SpecRow label="Power" value={board.power} />
      <SpecRow label="Format" value={board.formFactor} />
    </dl>
  );
}

function SpecRow({
  label,
  value,
  caution,
}: {
  label: string;
  value: string;
  caution?: string | null;
}) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 py-2.5">
      <dt className="pt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </dt>
      <dd className="min-w-0 break-words text-sm leading-6 text-zinc-200">
        {value}
        {caution ? (
          <span className="mt-0.5 block text-xs font-medium text-amber-200">{caution}</span>
        ) : null}
      </dd>
    </div>
  );
}
