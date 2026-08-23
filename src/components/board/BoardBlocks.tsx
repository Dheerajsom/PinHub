import type { ReactNode } from "react";
import { clsx } from "clsx";
import { ArrowUpRight, BadgeCheck, TriangleAlert } from "lucide-react";
import type { Board } from "@/lib/boards";
import { getBoardDiscoveryProfile } from "@/lib/board-discovery";
import { classifySource, verificationSourceFor } from "@/lib/source-trust";
import { revisionNotesFor } from "@/lib/board-utilities";
import { VendorLogo } from "@/components/VendorLogo";

/**
 * The shared vocabulary of a board record, so the catalog bench, the board
 * page, and the pinout page describe the same hardware the same way. Order is
 * fixed across all three: identity, hazards, then everything else — a wiring
 * caution is never below a description.
 */

type SectionProps = {
  legend: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** A titled area of the fascia. Legends are engraved, never decorated. */
export function Section({ legend, children, actions, className }: SectionProps) {
  return (
    <section className={clsx("panel", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-rule px-3 py-1.5">
        <h2 className="silk">{legend}</h2>
        {actions}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

/**
 * Identity plate: what the board is, and the four electrical facts that decide
 * whether it can be wired to anything else.
 */
export function BoardIdentity({
  board,
  headingLevel = 2,
}: {
  board: Board;
  headingLevel?: 1 | 2;
}) {
  const profile = getBoardDiscoveryProfile(board);
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const fiveVolt = profile.fiveVoltTolerance;

  return (
    <section className="panel">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-rule px-3 py-2.5">
        <div className="min-w-0">
          <p className="silk">
            {board.category} · {profile.computeClass}
          </p>
          <Heading className="readout mt-1 flex items-center gap-2 text-2xl uppercase leading-none text-ink sm:text-[1.75rem]">
            <VendorLogo vendor={board.vendor} size={22} />
            {board.name}
          </Heading>
          <p className="mt-1 text-[13px] text-dim">
            {board.vendor} · {board.family}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2">
        <SpecCell legend="Processor" value={board.processor} />
        <SpecCell
          legend="Logic level"
          value={board.logicLevel}
          note={
            fiveVolt === "No"
              ? "Not 5 V tolerant"
              : fiveVolt === "Mixed"
                ? "5 V tolerant on some pins only"
                : fiveVolt === "Yes"
                  ? "5 V tolerant"
                  : "5 V tolerance not documented"
          }
          emphasis={fiveVolt === "No" || fiveVolt === "Mixed"}
        />
        <SpecCell legend="Power" value={board.power} />
        <SpecCell legend="Form factor" value={board.formFactor} />
      </dl>

      <p className="border-t border-rule px-3 py-2.5 text-[13px] leading-relaxed text-dim">
        {board.description}
      </p>
    </section>
  );
}

function SpecCell({
  legend,
  value,
  note,
  emphasis,
}: {
  legend: string;
  value: string;
  note?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="border-t border-rule px-3 py-2 sm:[&:nth-child(2n)]:border-l">
      <dt className="silk">{legend}</dt>
      <dd className="mt-0.5 text-[13px] text-ink">
        {value}
        {note ? (
          <span
            className={clsx(
              "mt-0.5 block text-[11px]",
              emphasis ? "text-hazard-ink" : "text-faint",
            )}
          >
            {note}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

/**
 * Wiring cautions. Rendered above everything except the board's own identity,
 * on every surface, and never inside a collapsed disclosure — this is the block
 * that stops someone destroying a board.
 */
export function HazardBlock({ board }: { board: Board }) {
  if (!board.warnings.length) return null;
  return (
    <section
      className="border border-hazard/55 bg-hazard-wash"
      aria-labelledby={`hazards-${board.id}`}
    >
      <h2
        id={`hazards-${board.id}`}
        className="silk flex items-center gap-1.5 border-b border-hazard/35 px-3 py-1.5 !text-hazard-ink"
      >
        <TriangleAlert className="size-3" aria-hidden="true" />
        Check before wiring · {board.warnings.length}
      </h2>
      <ul className="grid gap-1.5 p-3 text-[13px] leading-snug text-hazard-ink">
        {board.warnings.map((warning) => (
          <li key={warning} className="flex gap-2">
            <span
              className="mt-[0.45rem] size-1 shrink-0 bg-hazard"
              aria-hidden="true"
            />
            {warning}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The single source most useful for checking the map before wiring. */
export function VerifyStrip({ board }: { board: Board }) {
  const source = verificationSourceFor(board);
  if (!source) return null;
  const official = classifySource(board.vendor, source.url) === "official";
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="panel group flex items-center justify-between gap-3 px-3 py-2 text-[13px] transition-colors hover:bg-raised"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="silk shrink-0">Verify against</span>
        <span className="min-w-0 truncate text-ink">{source.label}</span>
        <span className={clsx("chip shrink-0", official && "chip-verified")}>
          {official ? "OFFICIAL" : "3RD-PARTY"}
        </span>
      </span>
      <ArrowUpRight
        className="size-3.5 shrink-0 text-faint transition-colors group-hover:text-ink"
        aria-hidden="true"
      />
    </a>
  );
}

/** Every reference behind the entry, each labelled with its provenance. */
export function SourceList({ board }: { board: Board }) {
  return (
    <Section legend={`Sources · ${board.sourceLinks.length}`}>
      <ul className="grid gap-1">
        {board.sourceLinks.map((source) => {
          const official = classifySource(board.vendor, source.url) === "official";
          return (
            <li key={source.url}>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="well group flex min-w-0 items-center justify-between gap-2 px-2.5 py-2 text-[13px] text-dim transition-colors hover:bg-raised hover:text-ink"
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="silk shrink-0">{source.type}</span>
                  <span className="min-w-0 truncate">{source.label}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={clsx("chip", official && "chip-verified")}
                    title={
                      official
                        ? "Published by the board or primary-component vendor"
                        : `Not published by ${board.vendor} — cross-check against vendor documentation`
                    }
                  >
                    {official ? (
                      <BadgeCheck className="size-2.5" aria-hidden="true" />
                    ) : null}
                    {official ? "OFFICIAL" : "3RD-PARTY"}
                  </span>
                  <ArrowUpRight
                    className="size-3.5 text-faint transition-colors group-hover:text-ink"
                    aria-hidden="true"
                  />
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

export function InterfaceList({ board }: { board: Board }) {
  return (
    <Section legend={`Interfaces · ${board.interfaces.length}`}>
      <ul className="flex flex-wrap gap-1">
        {board.interfaces.map((item) => (
          <li key={item} className="chip">
            {item}
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function HighlightList({ board }: { board: Board }) {
  if (!board.highlights.length) return null;
  return (
    <Section legend="Why it matters">
      <ul className="grid gap-1.5 text-[13px] leading-snug text-dim">
        {board.highlights.map((item) => (
          <li key={item} className="flex gap-2">
            <span
              className="mt-[0.45rem] size-1 shrink-0 bg-rule-strong"
              aria-hidden="true"
            />
            {item}
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function RevisionNotes({ board }: { board: Board }) {
  const notes = revisionNotesFor(board);
  return (
    <Section legend="Revision notes">
      {notes.length ? (
        <ul className="grid gap-1.5 text-[13px] leading-snug text-dim">
          {notes.map((note) => (
            <li key={note} className="flex gap-2">
              <span
                className="mt-[0.45rem] size-1 shrink-0 bg-rule-strong"
                aria-hidden="true"
              />
              {note}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] leading-snug text-faint">
          No revision-specific difference is documented in PinHub for this board.
          Check the linked vendor material against your exact hardware revision.
        </p>
      )}
    </Section>
  );
}
