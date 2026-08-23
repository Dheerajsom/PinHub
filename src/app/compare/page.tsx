import type { Metadata } from "next";
import { boards, type Board } from "@/lib/boards";
import { assertBoardVisualsValid } from "@/lib/board-visual-validation";
import { assertBoardSourcesValid } from "@/lib/source-trust";
import { summarizeBoard } from "@/lib/board-summary";
import { parseComparedIds } from "@/lib/compare-params";
import { signalRowsFor } from "@/lib/compare-pins";
import { AppHeader } from "@/components/shell/AppHeader";
import { CompareTable } from "@/components/CompareTable";
import { ComparePicker } from "@/components/compare/ComparePicker";

export const metadata: Metadata = {
  title: "Compare development boards",
  description:
    "Compare processors, logic levels, 5 V tolerance, power, interfaces, wiring cautions, and source-backed pinout coverage side by side.",
  alternates: { canonical: "/compare" },
};

assertBoardSourcesValid(boards);
assertBoardVisualsValid();

const catalog = boards.map((board, index) => summarizeBoard(board, index));

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ boards?: string | string[] }>;
}) {
  const params = await searchParams;
  const requested = parseComparedIds(params.boards);
  const selected = requested
    .map((id) => boards.find((board) => board.id === id))
    .filter((board): board is Board => Boolean(board));

  return (
    <div className="panel-grain flex min-h-screen flex-col">
      <AppHeader
        section="compare"
        context={
          selected.length >= 2
            ? selected.map((board) => board.name).join(" vs ")
            : undefined
        }
      />
      <main className="mx-auto w-full max-w-[1720px] flex-1 px-4 py-3 sm:px-6">
        {selected.length < 2 ? (
          <>
            <div className="mx-auto mb-3 max-w-3xl">
              <h1 className="readout text-2xl uppercase text-ink">
                Compare boards
              </h1>
              <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-dim">
                Differences are shown first, and logic level, 5&nbsp;V tolerance,
                and wiring cautions stay visible — electrical compatibility is
                usually what the decision turns on.
              </p>
              {requested.length === 1 ? (
                <p className="mt-2 text-[13px] text-dim" role="status">
                  One board is selected. Add at least one more to see a
                  comparison.
                </p>
              ) : null}
            </div>
            <ComparePicker catalog={catalog} seeded={requested} />
          </>
        ) : (
          <>
            <h1 className="sr-only">
              Comparing {selected.map((board) => board.name).join(", ")}
            </h1>
            <CompareTable
              boards={selected}
              signalRows={signalRowsFor(selected)}
            />
          </>
        )}
      </main>
    </div>
  );
}
