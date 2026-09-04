import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Cable,
  CircuitBoard,
  Cpu,
  GitBranch,
  ShieldAlert,
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
import { revisionNotesFor } from "@/lib/board-utilities";
import { CircuitBackground } from "@/components/CircuitBackground";
import { PinoutTabs } from "@/components/PinoutTabs";
import { VendorLogo } from "@/components/VendorLogo";
import { BoardActions } from "@/components/BoardActions";
import { BoardPriceLink } from "@/components/BoardPriceLink";
import { ThemeToggle } from "@/components/ThemeToggle";

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

  return (
    <main className="relative isolate min-h-screen pb-10">
      <CircuitBackground />
      <header className="relative border-b border-white/10 bg-[#0a0d12] px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-cyan-200">
            <ArrowLeft className="size-4" /> Back to discovery
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/" className="brand-title text-xl text-white">PinHub</Link>
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#12161d] p-5 shadow-2xl sm:p-7">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
          <div className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full bg-cyan-300/[0.07] blur-3xl" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200">
                <Cpu className="size-3.5" /> {classification}
              </div>
              <h1 className="mt-3 flex items-center gap-3 text-3xl font-semibold text-white sm:text-4xl">
                <VendorLogo vendor={board.vendor} size={34} />
                {board.name}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">{board.description}</p>
              <div className="mt-5">
                <BoardActions board={board} />
              </div>
            </div>
            <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:w-[25rem] lg:grid-cols-1">
              <HeroSpec label="Processor" value={board.processor} />
              <HeroSpec label="Logic" value={board.logicLevel} />
              <HeroSpec label="Power" value={board.power} />
              <HeroSpec label="Format" value={board.formFactor} />
            </div>
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(19rem,0.7fr)]">
          <div className="min-w-0 space-y-5">
            {board.warnings.length ? (
              <section className="rounded-xl border border-orange-300/30 bg-[#1b1410] p-4 sm:p-5">
                <div className="flex items-center gap-2 font-semibold text-orange-100">
                  <ShieldAlert className="size-4" /> Check before wiring
                </div>
                <ul className="mt-3 grid gap-2 text-sm leading-6 text-orange-50/70">
                  {board.warnings.map((warning) => (
                    <li key={warning} className="flex gap-2"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-orange-300" />{warning}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="surface-panel rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Cable className="size-4 text-cyan-200" aria-hidden="true" />
                Interfaces
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {board.interfaces.map((item) => (
                  <span key={item} className="surface-well rounded-md px-2.5 py-1.5 font-mono text-xs text-zinc-300">{item}</span>
                ))}
              </div>
            </section>

            <section className="surface-panel rounded-xl p-4 sm:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Source-backed connector</div>
                  <h2 className="mt-1 text-lg font-semibold text-white">Interactive pin map</h2>
                </div>
                {board.pinout ? (
                  <Link href={`/pinout/${board.id}`} className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-50 transition hover:bg-cyan-300/20">
                    <CircuitBoard className="size-4" /> Open full inspector
                  </Link>
                ) : null}
              </div>
              <PinoutTabs board={board} />
            </section>

            <section className="surface-panel rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-2 font-semibold text-white"><Sparkles className="size-4 text-emerald-200" /> Why it matters</div>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-zinc-400 sm:grid-cols-2">
                {board.highlights.map((item) => <li key={item} className="surface-well rounded-lg p-3">{item}</li>)}
              </ul>
            </section>
          </div>

          <aside className="min-w-0 space-y-5">
            <BoardPriceLink boardId={board.id} />
            {verifySource ? (
              <a href={verifySource.url} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between gap-3 rounded-xl border border-orange-300/30 bg-[#1b1410] p-4 text-sm text-orange-100 transition hover:border-orange-300/60">
                <span><span className="block text-[10px] uppercase tracking-[0.15em] text-orange-200/60">Verify before wiring</span><span className="mt-1 block font-medium">{verifySource.label}</span></span>
                <ArrowUpRight className="size-4 shrink-0 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            ) : null}

            <section className="surface-panel rounded-xl p-4">
              <div className="flex items-center gap-2 font-semibold text-white"><GitBranch className="size-4 text-amber-200" /> Revision notes</div>
              {revisionNotes.length ? (
                <ul className="mt-3 grid gap-2 text-sm leading-6 text-zinc-400">
                  {revisionNotes.map((note) => <li key={note} className="surface-well rounded-lg p-3">{note}</li>)}
                </ul>
              ) : (
                <p className="mt-3 text-sm leading-6 text-zinc-500">No revision-specific differences are documented in PinHub for this board. Check the linked vendor material for your exact hardware revision.</p>
              )}
            </section>

            <section className="surface-panel rounded-xl p-4">
              <div className="mb-3 flex items-center gap-2 font-semibold text-white"><BookOpen className="size-4 text-cyan-200" /> Source references</div>
              <div className="grid gap-4">
                {(["Docs", "Datasheet", "Schematic", "Manual", "Pinout"] as const).map((type) => {
                  const sources = board.sourceLinks.filter((source) => source.type === type);
                  if (!sources.length) return null;
                  return (
                    <div key={type}>
                      <h3 className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-zinc-600">{type}</h3>
                      <div className="grid gap-2">
                        {sources.map((source) => {
                          const official = classifySource(board.vendor, source.url) === "official";
                          return (
                            <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="surface-well group flex items-start justify-between gap-2 rounded-lg p-3 text-sm text-zinc-300 transition hover:border-cyan-300/40 hover:text-white">
                              <span className="min-w-0">{source.label}</span>
                              {official ? <BadgeCheck className="mt-1 size-4 shrink-0 text-emerald-300" aria-label="Official source" /> : <ArrowUpRight className="mt-1 size-4 shrink-0 text-zinc-600" />}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>

        {related.length ? (
          <section className="mt-5">
            <div className="mb-3"><div className="text-xs uppercase tracking-[0.18em] text-cyan-200">Keep exploring</div><h2 className="mt-1 text-xl font-semibold text-white">Similar boards</h2></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {related.map(({ board: item, reasons }) => (
                <Link key={item.id} href={`/boards/${item.id}`} className="surface-panel group rounded-xl p-4 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/35">
                  <div className="flex items-center gap-2 font-semibold text-white"><VendorLogo vendor={item.vendor} />{item.name}</div>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">{reasons.join(" · ")}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function HeroSpec({ label, value }: { label: string; value: string }) {
  return <div className="surface-well rounded-lg p-3"><div className="text-[10px] uppercase tracking-[0.15em] text-zinc-600">{label}</div><div className="mt-1 text-sm text-zinc-200">{value}</div></div>;
}
