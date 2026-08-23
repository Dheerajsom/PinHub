"use client";

import Link from "next/link";
import { ArrowUp, ExternalLink, LoaderCircle, TriangleAlert } from "lucide-react";
import type { Board } from "@/lib/boards";
import type { BoardSummary } from "@/lib/board-summary";
import { BoardActions } from "@/components/BoardActions";
import { PinoutTabs } from "@/components/PinoutTabs";
import {
  BoardIdentity,
  HazardBlock,
  HighlightList,
  InterfaceList,
  RevisionNotes,
  Section,
  SourceList,
  VerifyStrip,
} from "@/components/board/BoardBlocks";

export type BenchState =
  | { status: "ready"; board: Board }
  | { status: "loading"; board: null; id: string }
  | { status: "error"; board: null; id: string };

type BoardBenchProps = {
  expectedBoard: BoardSummary;
  benchState: BenchState;
  onRetry: () => void;
  onBackToIndex: () => void;
};

/**
 * The bench: the board currently under inspection.
 *
 * Order is fixed and matches every other board surface in the product —
 * identity, hazards, the pin map, then supporting material. A wiring caution is
 * never below a description, at any width.
 */
export function BoardBench({
  expectedBoard,
  benchState,
  onRetry,
  onBackToIndex,
}: BoardBenchProps) {
  const board =
    benchState.status === "ready" && benchState.board.id === expectedBoard.id
      ? benchState.board
      : null;
  const failed =
    benchState.status === "error" && benchState.id === expectedBoard.id;

  if (!board) {
    return (
      <div className="grid gap-2">
        <BackToIndex onClick={onBackToIndex} />
        <section className="panel p-4" aria-busy={!failed}>
          <div className="flex items-start gap-2.5">
            {failed ? (
              <TriangleAlert
                className="mt-0.5 size-4 shrink-0 text-hazard"
                aria-hidden="true"
              />
            ) : (
              <LoaderCircle
                className="mt-0.5 size-4 shrink-0 animate-spin text-faint"
                aria-hidden="true"
              />
            )}
            <div className="min-w-0">
              <p className="readout truncate text-base uppercase text-ink">
                {expectedBoard.name}
              </p>
              <p
                className="mt-1 text-[13px] text-dim"
                role="status"
                aria-live="polite"
              >
                {failed
                  ? "The board record could not be loaded. It may be a network problem — the catalog entry itself is fine."
                  : "Loading the source-backed record…"}
              </p>
              {failed ? (
                <button type="button" onClick={onRetry} className="ctl mt-3">
                  Try again
                </button>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <BackToIndex onClick={onBackToIndex} />

      <span className="sr-only" role="status" aria-live="polite">
        {board.name} record loaded.
      </span>

      <BoardIdentity board={board} />
      <HazardBlock board={board} />
      <VerifyStrip board={board} />

      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-3 py-1.5">
          <h2 className="silk">
            {board.pinout
              ? `Pin map · ${board.pinout.connector}`
              : "Pin map"}
          </h2>
          {board.pinout ? (
            <Link
              href={`/pinout/${encodeURIComponent(board.id)}`}
              className="silk inline-flex items-center gap-1 !text-dim transition-colors hover:!text-ink"
            >
              Full inspector
              <ExternalLink className="size-2.5" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
        <div className="p-3">
          {board.pinout ? (
            <PinoutTabs board={board} />
          ) : (
            <p className="text-[13px] leading-snug text-dim">
              PinHub does not publish an in-app map for this connector yet. Pin
              data is only added once it can be checked against a vendor
              document, so nothing is shown rather than guessed — use the sources
              below for the authoritative pinout.
            </p>
          )}
        </div>
      </section>

      <Section legend="Actions">
        <BoardActions board={board} />
      </Section>

      <InterfaceList board={board} />
      <HighlightList board={board} />
      <RevisionNotes board={board} />
      <SourceList board={board} />

      <Link
        href={`/boards/${encodeURIComponent(board.id)}`}
        className="ctl w-full"
      >
        Open the full {board.name} page
      </Link>
    </div>
  );
}

function BackToIndex({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="ctl w-full bench:hidden">
      <ArrowUp className="size-3.5" aria-hidden="true" />
      Back to the index
    </button>
  );
}
