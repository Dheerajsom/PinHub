import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { boards, type Board } from "@/lib/boards";
import { sharedDiscoveryReasons } from "@/lib/board-discovery";
import { siteName } from "@/lib/site";
import { AppHeader } from "@/components/shell/AppHeader";
import { PinoutTabs } from "@/components/PinoutTabs";
import { VendorLogo } from "@/components/VendorLogo";
import { BoardActions } from "@/components/BoardActions";
import { ReadoutRail } from "@/components/rail/ReadoutRail";
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

export const dynamicParams = false;

export function generateStaticParams() {
  return boards.map((board) => ({ id: board.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const board = boards.find((item) => item.id === id);
  if (!board) return { title: "Board not found" };
  const title = `${board.name} pinout and specifications`;
  return {
    title,
    description: board.description,
    alternates: { canonical: `/boards/${board.id}` },
    openGraph: {
      type: "website",
      url: `/boards/${board.id}`,
      siteName,
      title,
      description: board.description,
    },
  };
}

function similarBoards(board: Board) {
  return boards
    .filter((candidate) => candidate.id !== board.id)
    .map((candidate) => ({
      board: candidate,
      reasons: sharedDiscoveryReasons(board, candidate),
    }))
    .filter((item) => item.reasons.length)
    .sort(
      (a, b) =>
        b.reasons.length - a.reasons.length ||
        a.board.name.localeCompare(b.board.name),
    )
    .slice(0, 4);
}

/**
 * The canonical, shareable page for one board — the link you paste in a thread.
 *
 * It carries the same block order as every other board surface (identity,
 * hazards, pin map, supporting material) so nothing moves when a reader
 * arrives here from the index, and it keeps the readout rail docked so the
 * connector is readable without scrolling back up.
 */
export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const board = boards.find((item) => item.id === id);
  if (!board) notFound();
  const related = similarBoards(board);

  return (
    <div className="panel-grain flex min-h-screen flex-col">
      <AppHeader section="index" context={board.name} />

      <main className="mx-auto w-full max-w-[1720px] flex-1 px-4 py-2 sm:px-6">
        <Link href="/" className="ctl mb-2" data-print="hide">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to the index
        </Link>

        <div className="grid gap-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(19rem,0.7fr)] lg:items-start">
          <div className="grid min-w-0 gap-2">
            <BoardIdentity board={board} headingLevel={1} />
            <HazardBlock board={board} />

            <Section legend="Actions">
              <BoardActions board={board} />
            </Section>

            <section className="panel" data-print="expand">
              <div className="border-b border-rule px-3 py-1.5">
                <h2 className="silk">
                  {board.pinout
                    ? `Pin map · ${board.pinout.connector}`
                    : "Pin map"}
                </h2>
              </div>
              <div className="p-3">
                {board.pinout ? (
                  <PinoutTabs board={board} />
                ) : (
                  <p className="text-[13px] leading-snug text-dim">
                    PinHub does not publish an in-app map for this connector
                    yet. Pin data is only added once it can be checked against a
                    vendor document, so nothing is shown rather than guessed —
                    the sources list the authoritative pinout.
                  </p>
                )}
              </div>
            </section>

            <HighlightList board={board} />
          </div>

          <aside className="grid min-w-0 gap-2">
            <VerifyStrip board={board} />
            <InterfaceList board={board} />
            <RevisionNotes board={board} />
            <SourceList board={board} />

            {related.length ? (
              <Section legend="Similar boards" className="lg:sticky lg:top-2">
                <ul className="grid gap-1">
                  {related.map(({ board: item, reasons }) => (
                    <li key={item.id}>
                      <Link
                        href={`/boards/${item.id}`}
                        className="well flex items-center gap-2 px-2.5 py-2 transition-colors hover:bg-raised"
                      >
                        <VendorLogo vendor={item.vendor} size={16} />
                        <span className="min-w-0">
                          <span className="readout block truncate text-[13px] uppercase text-ink">
                            {item.name}
                          </span>
                          <span className="block truncate text-[11px] text-faint">
                            {reasons.join(" · ")}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}
          </aside>
        </div>
      </main>

      <div className="sticky bottom-0 z-10">
        <ReadoutRail board={board} />
      </div>
    </div>
  );
}
