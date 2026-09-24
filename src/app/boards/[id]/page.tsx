import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  GitBranch,
  Sparkles,
} from "lucide-react";
import { boards, type Board } from "@/lib/boards";
import {
  getBoardDiscoveryProfile,
  sharedDiscoveryReasons,
} from "@/lib/board-discovery";
import { classifySource, verificationSourceFor } from "@/lib/source-trust";
import { siteName } from "@/lib/site";
import { boardVisuals } from "@/lib/board-visuals";
import { fiveVoltCaution, revisionNotesFor } from "@/lib/board-utilities";
import { CircuitBackground } from "@/components/CircuitBackground";
import { PinoutTabs } from "@/components/PinoutTabs";
import { VendorLogo } from "@/components/VendorLogo";
import { BoardActions } from "@/components/BoardActions";
import { BoardPriceLink } from "@/components/BoardPriceLink";
import { SiteHeader } from "@/components/SiteHeader";
import { WiringCautions } from "@/components/WiringCautions";
import { InterfaceChip } from "@/components/InterfaceChip";

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
  const title = `${board.name} overview and pinout`;
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
    .sort((a, b) => b.reasons.length - a.reasons.length || a.board.name.localeCompare(b.board.name))
    .slice(0, 4);
}

const sourceTypeOrder = ["Pinout", "Schematic", "Datasheet", "Manual", "Docs"] as const;

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const board = boards.find((item) => item.id === id);
  if (!board) notFound();
  const profile = getBoardDiscoveryProfile(board);
  const classification = [
    ...new Map(
      [profile.computeClass, board.category].map((label) => [
        label.toLocaleLowerCase(),
        label,
      ]),
    ).values(),
  ].join(" · ");
  const verifySource = verificationSourceFor(board);
  const related = similarBoards(board);
  const revisionNotes = [
    ...revisionNotesFor(board),
    ...(boardVisuals[board.id]?.revisionNote
      ? [boardVisuals[board.id].revisionNote]
      : []),
  ].filter((note, index, all) => all.indexOf(note) === index);
  const logicCaution = fiveVoltCaution(board);

  return (
    <main className="relative isolate min-h-screen pb-10">
      <CircuitBackground />
      <SiteHeader />

      <div className="relative mx-auto max-w-[1280px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        {/* Title block: identity and the four characteristics people check
            first, laid out as a ruled key/value table like a datasheet's
            front page rather than as four floating tiles. */}
        <section className="surface-panel overflow-hidden rounded-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="min-w-0 p-5 sm:p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cyan-200">
                {classification}
              </p>
              <h1 className="mt-2.5 flex items-start gap-3 text-[1.75rem] font-semibold leading-tight tracking-tight text-white sm:text-4xl">
                <span className="mt-0.5 grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-[#0a0c11] sm:size-11">
                  <VendorLogo vendor={board.vendor} size={26} />
                </span>
                <span className="min-w-0 break-words">{board.name}</span>
              </h1>
              <p className="mt-2 font-mono text-xs text-zinc-500">
                {board.vendor} / {board.family}
              </p>
              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-zinc-400">
                {board.description}
              </p>
              <ul
                aria-label={`${board.interfaces.length} interfaces`}
                className="mt-4 flex flex-wrap gap-1.5"
              >
                {board.interfaces.map((item) => (
                  <li key={item}>
                    <InterfaceChip name={item} />
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <BoardActions board={board} />
              </div>
            </div>
            <dl className="ph-spec-table border-t border-white/10 bg-[#0e1118] px-5 py-1 lg:border-l lg:border-t-0">
              <SpecRow label="Processor" value={board.processor} />
              <SpecRow label="Logic" value={board.logicLevel} caution={logicCaution} />
              <SpecRow label="Power" value={board.power} />
              <SpecRow label="Format" value={board.formFactor} />
            </dl>
          </div>
        </section>

        {/* Pin map leads the page; the wiring cautions sit beside it on wide
            screens and before it on phones (DOM order), so a hazard is always
            read before the map it applies to. */}
        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <WiringCautions
            warnings={board.warnings}
            verifySource={verifySource}
            verifySourceOfficial={
              verifySource
                ? classifySource(board.vendor, verifySource.url) === "official"
                : false
            }
            className="lg:col-start-2 lg:row-start-1"
          />

          {/* The pin map widget carries its own "Pin map" label, view tabs,
              and a Full view link, so it needs no second header here. */}
          <section
            aria-label="Pin map"
            className="surface-panel min-w-0 rounded-xl p-4 sm:p-5 lg:col-start-1 lg:row-span-3 lg:row-start-1"
          >
            <PinoutTabs board={board} />
          </section>

          <div className="min-w-0 space-y-5 lg:col-start-2 lg:row-start-2">
            <BoardPriceLink boardId={board.id} />

            <section className="surface-panel rounded-xl p-4">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-tight text-white">
                <GitBranch className="size-4 text-amber-200" aria-hidden="true" /> Revision notes
              </h2>
              {revisionNotes.length ? (
                <ul className="mt-3 grid gap-2 text-sm leading-6 text-zinc-400">
                  {revisionNotes.map((note) => <li key={note} className="surface-well rounded-lg p-3">{note}</li>)}
                </ul>
              ) : (
                <p className="mt-2 text-[13px] leading-6 text-zinc-500">No revision-specific differences are documented in PinHub for this board. Check the linked vendor material for your exact hardware revision.</p>
              )}
            </section>

            <section className="surface-panel rounded-xl p-4">
              <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold tracking-tight text-white">
                <BookOpen className="size-4 text-cyan-200" aria-hidden="true" /> Source references
              </h2>
              <div className="grid gap-4">
                {sourceTypeOrder.map((type) => {
                  const sources = board.sourceLinks.filter((source) => source.type === type);
                  if (!sources.length) return null;
                  return (
                    <div key={type}>
                      <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">{type}</h3>
                      <div className="grid gap-2">
                        {sources.map((source) => {
                          const official = classifySource(board.vendor, source.url) === "official";
                          return (
                            <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="surface-well group flex min-h-11 items-start justify-between gap-2 rounded-lg p-3 text-sm text-zinc-300 transition hover:border-cyan-300/40 hover:text-white">
                              <span className="min-w-0 break-words">
                                {source.label}
                                <span className="sr-only">{official ? " (official source)" : " (third-party source)"}, opens in a new tab</span>
                              </span>
                              {official ? <BadgeCheck className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden="true" /> : <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-zinc-500" aria-hidden="true" />}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {board.highlights.length ? (
            <section className="surface-panel min-w-0 rounded-xl p-4 sm:p-5 lg:col-start-1">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-tight text-white">
                <Sparkles className="size-4 text-emerald-200" aria-hidden="true" /> Why it matters
              </h2>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-zinc-400 sm:grid-cols-2">
                {board.highlights.map((item) => <li key={item} className="surface-well rounded-lg p-3">{item}</li>)}
              </ul>
            </section>
          ) : null}
        </div>

        {related.length ? (
          <section className="mt-6" aria-labelledby="similar-heading">
            <h2 id="similar-heading" className="mb-3 text-lg font-semibold text-white">Similar boards</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {related.map(({ board: item, reasons }) => (
                <Link key={item.id} href={`/boards/${item.id}`} className="surface-panel group min-w-0 rounded-xl p-4 transition hover:border-cyan-300/35">
                  <span className="flex items-center gap-2 font-semibold text-white">
                    <VendorLogo vendor={item.vendor} />
                    <span className="min-w-0 truncate">{item.name}</span>
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-zinc-500">{reasons.join(" · ")}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
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
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 py-3">
      <dt className="pt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </dt>
      <dd className="min-w-0 text-sm leading-6 text-zinc-200">
        {value}
        {caution ? (
          <span className="mt-1 block text-xs font-medium text-amber-200">{caution}</span>
        ) : null}
      </dd>
    </div>
  );
}
