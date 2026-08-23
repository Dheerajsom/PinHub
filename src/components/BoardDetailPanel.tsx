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
  ShieldAlert,
  Zap,
} from "lucide-react";
import type { Board } from "@/lib/boards";
import type { BoardSummary } from "@/lib/board-summary";
import { VendorLogo } from "@/components/VendorLogo";
import { PinoutTabs } from "@/components/PinoutTabs";
import { BoardActions } from "@/components/BoardActions";
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
          className="min-w-0 space-y-4 lg:sticky lg:top-[4.25rem] lg:self-start"
          aria-busy={!failed}
        >
          <button
            type="button"
            onClick={onBackToResults}
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-3 text-sm font-medium text-zinc-300 transition hover:border-cyan-300/50 hover:text-white lg:hidden"
          >
            <ArrowUp className="size-4" aria-hidden="true" />
            Back to results
          </button>
          <section className="surface-panel rounded-lg p-5">
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
                <div className="truncate font-semibold text-white">
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
                className="mt-4 rounded-md border border-cyan-300/50 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-300/20"
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
  return (
    <aside className="min-w-0 space-y-4 lg:sticky lg:top-[4.25rem] lg:max-h-[calc(100vh-5.25rem)] lg:self-start lg:overflow-y-auto lg:pb-2 lg:pr-1">
      {/* Stacked-layout escape hatch: the detail panel sits below the result
          list on phones, so offer a quick way back up. Hidden on lg+. */}
      <button
        type="button"
        onClick={onBackToResults}
        className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-3 text-sm font-medium text-zinc-300 shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition hover:border-cyan-300/50 hover:bg-[#1c2029] hover:text-white active:scale-[0.99] lg:hidden"
      >
        <ArrowUp className="size-4" aria-hidden="true" />
        Back to results
      </button>
      <section className="surface-panel rounded-lg p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Selected board
            </div>
            <h2 className="mt-2 flex items-center gap-2.5 text-2xl font-semibold text-white">
              <VendorLogo vendor={board.vendor} size={24} />
              {board.name}
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              {board.vendor} / {board.family}
            </p>
          </div>
          <div className="grid size-11 shrink-0 place-items-center rounded-lg border border-amber-300/40 bg-amber-300/10 text-amber-100">
            <Cpu className="size-5" aria-hidden="true" />
          </div>
        </div>

        <dl className="mt-5 grid gap-3 text-sm">
          <SpecRow label="Processor" value={board.processor} />
          <SpecRow label="Logic" value={board.logicLevel} />
          <SpecRow label="Power" value={board.power} />
          <SpecRow label="Format" value={board.formFactor} />
        </dl>
        <div className="mt-4 border-t border-white/10 pt-4">
          <BoardActions board={board} />
        </div>
      </section>

      {verifySource ? (
        <a
          href={verifySource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between gap-3 rounded-lg border border-orange-300/30 bg-[#1b1410] px-3.5 py-2.5 text-sm text-orange-100/90 shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition hover:border-orange-300/60 hover:text-orange-50"
        >
          <span className="flex min-w-0 items-center gap-2">
            <ShieldAlert
              className="size-4 shrink-0 text-orange-200"
              aria-hidden="true"
            />
            <span className="min-w-0 truncate">
              Verify before wiring:{" "}
              <span className="font-medium">{verifySource.label}</span>
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
            className="size-4 shrink-0 text-orange-200/60 transition group-hover:text-orange-100"
            aria-hidden="true"
          />
        </a>
      ) : null}

      <PinoutTabs board={board} />

      <section className="surface-panel rounded-lg p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><Cable className="size-4 text-cyan-200" /> Interfaces</div>
        <div className="flex flex-wrap gap-1.5">{board.interfaces.map((item) => <span key={item} className="surface-well rounded-md px-2 py-1 font-mono text-[11px] text-zinc-300">{item}</span>)}</div>
      </section>

      <section className="surface-panel rounded-lg p-4">
        <div className="text-sm font-semibold text-white">Revision notes</div>
        {revisionNotes.length ? <ul className="mt-2 grid gap-2 text-sm leading-6 text-zinc-400">{revisionNotes.map((note) => <li key={note}>{note}</li>)}</ul> : <p className="mt-2 text-sm leading-6 text-zinc-500">No revision-specific note is documented in PinHub. Verify your exact board revision against the linked sources.</p>}
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
        <InfoBlock
          title="Why it matters"
          icon={<Zap className="size-4 text-emerald-200" aria-hidden="true" />}
          items={board.highlights}
        />
        <InfoBlock
          title="Check before wiring"
          icon={
            <ShieldAlert className="size-4 text-orange-200" aria-hidden="true" />
          }
          items={board.warnings}
          tone="warning"
        />
      </section>

      <section className="surface-panel rounded-lg p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <BookOpen className="size-4 text-cyan-200" aria-hidden="true" />
          Source references
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
                className="surface-well group flex min-w-0 items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm text-zinc-300 transition hover:border-cyan-300/50 hover:bg-[#13161c] hover:text-white"
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="shrink-0 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-zinc-500 transition group-hover:text-zinc-300">
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
      </section>
    </aside>
  );
}

type SpecRowProps = {
  label: string;
  value: string;
};

function SpecRow({ label, value }: SpecRowProps) {
  return (
    <div className="grid gap-1 border-t border-white/10 pt-3 first:border-t-0 first:pt-0 sm:grid-cols-[6rem_minmax(0,1fr)]">
      <dt className="text-xs uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </dt>
      <dd className="text-zinc-200">{value}</dd>
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
  return (
    <section
      className={clsx(
        "rounded-lg p-4",
        tone === "warning"
          ? "border border-orange-300/30 bg-[#1b1410] shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
          : "surface-panel",
      )}
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        {icon}
        {title}
      </div>
      <ul className="space-y-2 text-sm leading-6 text-zinc-400">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span
              className={clsx(
                "mt-2.5 size-1 shrink-0 rounded-full",
                tone === "warning" ? "bg-orange-300/70" : "bg-zinc-500",
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
