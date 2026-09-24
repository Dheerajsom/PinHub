import type { Metadata } from "next";
import { GitCompareArrows } from "lucide-react";
import { boards, type Board } from "@/lib/boards";
import { assertBoardVisualsValid } from "@/lib/board-visual-validation";
import { assertBoardSourcesValid } from "@/lib/source-trust";
import { summarizeBoard } from "@/lib/board-summary";
import { parseComparedIds } from "@/lib/compare-params";
import { CircuitBackground } from "@/components/CircuitBackground";
import { CompareTable } from "@/components/CompareTable";
import { DiscoveryApp } from "@/components/DiscoveryApp";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Compare development boards",
  description:
    "Discover and compare processors, logic levels, power, interfaces, connector ecosystems, warnings, and source-backed pinout coverage.",
  alternates: { canonical: "/compare" },
};

assertBoardSourcesValid(boards);
assertBoardVisualsValid();

const catalog = boards.map(summarizeBoard);
const sourceCount = boards.reduce(
  (total, board) => total + board.sourceLinks.length,
  0,
);

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ boards?: string | string[] }>;
}) {
  const params = await searchParams;
  const selected = parseComparedIds(params.boards)
    .map((id) => boards.find((board) => board.id === id))
    .filter((board): board is Board => Boolean(board));

  if (selected.length < 2) {
    return (
      <DiscoveryApp
        catalog={catalog}
        sourceCount={sourceCount}
        initialCompareIds={selected.map((board) => board.id)}
      />
    );
  }

  return (
    <main className="relative isolate min-h-screen pb-10">
      <CircuitBackground />
      <SiteHeader current="/compare" />
      <div className="relative mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 max-w-3xl">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200">
            <GitCompareArrows className="size-4" aria-hidden="true" /> Board comparison
          </div>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
            Compare the facts, not the hype.
          </h1>
          <p className="mt-3 text-base leading-7 text-zinc-400">
            Differences are highlighted first. Pinout availability and wiring
            cautions stay visible so electrical compatibility is part of the
            decision.
          </p>
        </div>
        <CompareTable boards={selected} />
      </div>
    </main>
  );
}
