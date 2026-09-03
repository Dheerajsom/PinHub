import type { ReactNode } from "react";
import { clsx } from "clsx";
import {
  ArrowUp,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Cable,
  Cpu,
  LoaderCircle,
  PlugZap,
  Ruler,
  ShieldAlert,
  Zap,
} from "lucide-react";
import type { Board } from "@/lib/boards";
import type { BoardSummary } from "@/lib/board-summary";
import { VendorLogo } from "@/components/VendorLogo";
import { PinoutTabs } from "@/components/PinoutTabs";
import { BoardActions } from "@/components/BoardActions";
import { BoardPriceLink } from "@/components/BoardPriceLink";
import { classifySource, verificationSourceFor } from "@/lib/source-trust";
import { revisionNotesFor } from "@/lib/board-utilities";

export type DetailState =
  | { status: "ready"; board: Board }
  | { status: "loading"; board: null; id: string }
  | { status: "error"; board: null; id: string };

type BoardDetailProps = {
  board: Board;
  onBackToResults: () => void;
};

type BoardDetailPanelProps = {
  expectedBoard: BoardSummary;
  detailState: DetailState;
  onRetry: () => void;
  onBackToResults: () => void;
};

export function BoardDetailPanel({
  expectedBoard,
  detailState,
  onRetry,
  onBackToResults,
}: BoardDetailPanelProps) {
  const board =
    detailState.status === "ready" &&
    detailState.board.id === expectedBoard.id
      ? detailState.board
      : null;
  const failed =
    detailState.status === "error" && detailState.id === expectedBoard.id;

  return (
    <>
      <span className="sr-only" role="status" aria-live="polite">
        {board
          ? `${expectedBoard.name} details loaded.`
          : failed
            ? `${expectedBoard.name} details could not be loaded.`
            : `Loading ${expectedBoard.name} details.`}
      </span>
      {board ? (
        <BoardDetail board={board} onBackToResults={onBackToResults} />
      ) : (
        <aside
          className="min-w-0 space-y-4 lg:sticky lg:top-[5.25rem] lg:self-start"
          aria-busy={!failed}
        >
          <button
            type="button"
            onClick={onBackToResults}
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#15181f] px-3 text-sm font-medium text-zinc-300 transition hover:border-cyan-300/50 hover:text-white lg:hidden"
          >
            <ArrowUp className="size-4" aria-hidden="true" />
            Back to results
          </button>
          <section className="surface-panel rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 text-cyan-100">
                {failed ? (
                  <ShieldAlert className="size-5" aria-hidden="true" />
                ) : (
                  <LoaderCircle
                    className="size-5 motion-safe:animate-spin"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold tracking-tight text-white">
                  {expectedBoard.name}
                </div>
                <p className="mt-1 text-sm text-zinc-400">
                  {failed
                    ? "The board details could not be loaded."
                    : "Loading source-backed pin data…"}
                </p>
              </div>
            </div>
            {failed ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-4 rounded-lg border border-cyan-300/50 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-300/20"
              >
                Try again
              </button>
            ) : null}
          </section>
        </aside>
      )}
    </>
  );
}
function BoardDetail({ board, onBackToResults }: BoardDetailProps) {
  const verifySource = verificationSourceFor(board);
  const verifySourceOfficial = verifySource
    ? classifySource(board.vendor, verifySource.url) === "official"
    : false;
  const revisionNotes = revisionNotesFor(board);
  const officialCount = board.sourceLinks.filter(
    (source) => classifySource(board.vendor, source.url) === "official",
  ).length;
  const isFiveVoltTolerant = /5\s?v/i.test(board.logicLevel) && /tolerant/i.test(board.warnings.join(" ") + board.logicLevel);
  return (
    <aside className="min-w-0 space-y-4 lg:sticky lg:top-[5.25rem] lg:max-h-[calc(100vh-6.25rem)] lg:self-start lg:overflow-y-auto lg:pb-2 lg:pr-1">
      {/* Stacked-layout escape hatch: the detail panel sits below the result
          list on phones, so offer a quick way back up. Hidden on lg+. */}
      <button
        type="button"
        onClick={onBackToResults}
        className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#15181f] px-3 text-sm font-medium text-zinc-300 shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition hover:border-cyan-300/50 hover:bg-[#1c2029] hover:text-white active:scale-[0.99] lg:hidden"
      >
        <ArrowUp className="size-4" aria-hidden="true" />
        Back to results
      </button>
      <section className="surface-panel overflow-hidden rounded-xl">
        <div className="h-[3px] w-full bg-gradient-to-r from-cyan-300 via-cyan-400/60 to-amber-300/80" aria-hidden="true" />
        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              <span className="ph-live-dot size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              Selected board
            </div>
            <span className="rounded-full border border-white/10 bg-[#0a0c11] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-zinc-400">
              {board.category}
            </span>
          </div>
          <div className="mt-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2.5 text-[22px] font-semibold leading-tight tracking-tight text-white">
                <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-[#0a0c11]">
                  <VendorLogo vendor={board.vendor} size={22} />
                </span>
                <span className="min-w-0 break-words">{board.name}</span>
              </h2>
              <p className="mt-2 font-mono text-xs text-zinc-500">
                {board.vendor} / {board.family}
              </p>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <SpecTile icon={<Cpu className="size-3.5 text-cyan-200" aria-hidden="true" />} label="Processor" value={board.processor} />
            <SpecTile
              icon={<Zap className="size-3.5 text-amber-200" aria-hidden="true" />}
              label="Logic"
              value={board.logicLevel}
              accent={isFiveVoltTolerant ? undefined : board.logicLevel.includes("3.3") ? "3V3 · not 5V tolerant" : undefined}
            />
            <SpecTile icon={<PlugZap className="size-3.5 text-emerald-200" aria-hidden="true" />} label="Power" value={board.power} />
            <SpecTile icon={<Ruler className="size-3.5 text-violet-200" aria-hidden="true" />} label="Format" value={board.formFactor} />
          </dl>
          <div className="mt-4 border-t border-white/10 pt-4">
            <BoardActions board={board} />
          </div>
        </div>
      </section>

      <BoardPriceLink boardId={board.id} />

      {verifySource ? (
        <a
          href={verifySource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between gap-3 rounded-xl border border-orange-300/30 bg-gradient-to-b from-[#211812] to-[#1b1410] px-3.5 py-3 text-sm text-orange-100/90 shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition hover:border-orange-300/60 hover:text-orange-50"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-orange-300/30 bg-orange-400/10">
              <ShieldAlert
                className="size-4 text-orange-200"
                aria-hidden="true"
              />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-200/80">
                Verify before wiring
              </span>
              <span className="mt-0.5 block truncate font-medium">
                {verifySource.label}
              </span>
            </span>
            <span
              className={clsx(
                "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium",
                verifySourceOfficial
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
                  : "border-white/15 bg-white/[0.05] text-zinc-300",
              )}
            >
              {verifySourceOfficial ? "Official" : "3rd-party"}
            </span>
          </span>
          <ArrowUpRight
            className="size-4 shrink-0 text-orange-200/60 transition group-hover:translate-x-0.5 group-hover:text-orange-100"
            aria-hidden="true"
          />
        </a>
      ) : null}

      <section className="surface-panel rounded-xl p-4">
        <PinoutTabs board={board} />
      </section>

      <section className="surface-panel rounded-xl p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md border border-white/10 bg-[#0a0c11]">
            <Cable className="size-3.5 text-cyan-200" aria-hidden="true" />
          </span>
          <span className="text-[13px] font-semibold tracking-tight text-white">Interfaces</span>
          <span className="ml-auto rounded-full bg-white/[0.05] px-2 py-0.5 font-mono text-[10px] tabular-nums text-zinc-400">
            {board.interfaces.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">{board.interfaces.map((item) => <span key={item} className="surface-well rounded-md px-2 py-1 font-mono text-[11px] font-medium text-zinc-300">{item}</span>)}</div>
      </section>

      <section className="surface-panel rounded-xl p-4">
        <div className="text-[13px] font-semibold tracking-tight text-white">Revision notes</div>
        {revisionNotes.length ? <ul className="mt-2 grid gap-2 text-sm leading-6 text-zinc-400">{revisionNotes.map((note) => <li key={note} className="flex gap-2"><span className="mt-2.5 size-1 shrink-0 rounded-full bg-cyan-300/70" aria-hidden="true" />{note}</li>)}</ul> : <p className="mt-2 text-[13px] leading-6 text-zinc-500">No revision-specific note is documented in PinHub. Verify your exact board revision against the linked sources.</p>}
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
        <InfoBlock
          title="Why it matters"
          icon={<Zap className="size-3.5 text-emerald-200" aria-hidden="true" />}
          items={board.highlights}
        />
        <InfoBlock
          title="Check before wiring"
          icon={
            <ShieldAlert className="size-3.5 text-orange-200" aria-hidden="true" />
          }
          items={board.warnings}
          tone="warning"
        />
      </section>

      <section className="surface-panel rounded-xl p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md border border-white/10 bg-[#0a0c11]">
            <BookOpen className="size-3.5 text-cyan-200" aria-hidden="true" />
          </span>
          <span className="text-[13px] font-semibold tracking-tight text-white">
            Source references
          </span>
          <span className="ml-auto font-mono text-[10px] tabular-nums text-zinc-500">
            {officialCount} official · {board.sourceLinks.length} total
          </span>
        </div>
        <div className="grid gap-2">
          {board.sourceLinks.map((source) => {
            const official =
              classifySource(board.vendor, source.url) === "official";
            return (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ph-source-row surface-well group flex min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:border-cyan-300/50 hover:text-white"
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="shrink-0 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500 transition group-hover:text-zinc-300">
                    {source.type}
                  </span>
                  <span className="min-w-0 truncate">{source.label}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {official ? (
                    <span
                      className="flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-100"
                      title="Official board-vendor or primary-component documentation"
                    >
                      <BadgeCheck className="size-3" aria-hidden="true" />
                      Official
                    </span>
                  ) : (
                    <span
                      className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-zinc-400"
                      title={`Not published by ${board.vendor} — cross-check against vendor documentation`}
                    >
                      3rd-party
                    </span>
                  )}
                  <ArrowUpRight
                    className="size-4 text-zinc-500 transition group-hover:text-cyan-200"
                    aria-hidden="true"
                  />
                </span>
              </a>
            );
          })}
        </div>
        <p className="mt-3 border-t border-white/10 pt-3 font-mono text-[11px] leading-5 text-zinc-500">
          Check your silkscreen revision against these sources before wiring.
        </p>
      </section>
    </aside>
  );
}

type SpecTileProps = {
  icon: ReactNode;
  label: string;
  value: string;
  accent?: string;
};

function SpecTile({ icon, label, value, accent }: SpecTileProps) {
  return (
    <div className="ph-spec-tile surface-well rounded-lg p-2.5">
      <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-1.5 truncate text-[13px] font-medium text-zinc-100" title={value}>
        {value}
      </dd>
      {accent ? (
        <dd className="mt-1 truncate text-[11px] font-medium text-amber-200/90" title={accent}>
          {accent}
        </dd>
      ) : null}
    </div>
  );
}

type InfoBlockProps = {
  title: string;
  icon: ReactNode;
  items: string[];
  tone?: "default" | "warning";
};

function InfoBlock({ title, icon, items, tone = "default" }: InfoBlockProps) {
  const count = items.length;
  return (
    <section
      className={clsx(
        "rounded-xl p-4",
        tone === "warning"
          ? "border border-orange-300/30 bg-gradient-to-b from-[#211812] to-[#1b1410] shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
          : "surface-panel",
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className={clsx(
          "grid size-7 place-items-center rounded-md border",
          tone === "warning" ? "border-orange-300/30 bg-orange-400/10" : "border-white/10 bg-[#0a0c11]",
        )}>
          {icon}
        </span>
        <span className="text-[13px] font-semibold tracking-tight text-white">
          {title}
        </span>
        <span className={clsx(
          "ml-auto rounded-full px-2 py-0.5 font-mono text-[10px] tabular-nums",
          tone === "warning" ? "bg-orange-400/10 text-orange-200" : "bg-white/[0.05] text-zinc-400",
        )}>
          {count}
        </span>
      </div>
      <ul className="space-y-2 text-[13px] leading-6 text-zinc-400">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span
              className={clsx(
                "mt-2.5 size-1 shrink-0 rounded-full",
                tone === "warning" ? "bg-orange-300/70" : "bg-emerald-300/60",
              )}
              aria-hidden="true"
            />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
