"use client";

import Link from "next/link";
import { Check, Copy, Eye, EyeOff, X } from "lucide-react";
import { clsx } from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Board } from "@/lib/boards";
import { getBoardDiscoveryProfile } from "@/lib/board-discovery";
import type { SignalRow } from "@/lib/compare-pins";
import { VendorLogo } from "@/components/VendorLogo";

type Row = { label: string; values: string[] };

function uniqueValues(values: string[]) {
  return new Set(values.map((value) => value.toLowerCase())).size;
}

export function CompareTable({
  boards,
  signalRows,
}: {
  boards: Board[];
  /** Bus-signal rows: which physical pin carries each signal on each board. */
  signalRows?: SignalRow[] | null;
}) {
  const [differencesOnly, setDifferencesOnly] = useState(true);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);
  const rows = useMemo<Row[]>(() => {
    const profiles = boards.map(getBoardDiscoveryProfile);
    return [
      { label: "Logic level", values: boards.map((item) => item.logicLevel) },
      { label: "5 V tolerance", values: profiles.map((item) => item.fiveVoltTolerance) },
      { label: "Wiring cautions", values: boards.map((item) => `${item.warnings.length}`) },
      { label: "Compute class", values: profiles.map((item) => item.computeClass) },
      { label: "Processor", values: boards.map((item) => item.processor) },
      { label: "Power", values: boards.map((item) => item.power) },
      { label: "Form factor", values: boards.map((item) => item.formFactor) },
      { label: "Wireless", values: profiles.map((item) => item.wireless.join(", ") || "None listed") },
      { label: "Connector ecosystem", values: profiles.map((item) => item.connectorEcosystems.join(", ") || "Board-specific") },
      { label: "Interfaces", values: boards.map((item) => item.interfaces.join(", ")) },
      { label: "In-app pin map", values: boards.map((item) => item.pinout ? "Available" : "Not available") },
      { label: "Sources", values: boards.map((item) => `${item.sourceLinks.length} linked references`) },
    ];
  }, [boards]);
  const visibleRows = differencesOnly
    ? rows.filter((row) => uniqueValues(row.values) > 1)
    : rows;

  function removeBoard(id: string) {
    const remaining = boards.filter((board) => board.id !== id).map((board) => board.id);
    window.location.assign(remaining.length ? `/compare?boards=${remaining.join(",")}` : "/");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopyState("idle"), 1800);
  }

  const copied = copyState === "copied";
  const copyFailed = copyState === "failed";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-dim" role="status" aria-live="polite">
          {differencesOnly ? `${visibleRows.length} differing attributes shown` : `${rows.length} attributes shown`}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setDifferencesOnly((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-[2px] border border-rule bg-face px-3 text-sm text-dim transition hover:text-ink">
            {differencesOnly ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            {differencesOnly ? "Show identical" : "Differences only"}
          </button>
          <button type="button" onClick={copyLink} className="inline-flex h-10 items-center gap-2 rounded-[2px] border border-rule bg-face px-3 text-sm text-dim transition hover:text-ink">
            {copied ? <Check className="size-4 text-verified-ink" /> : copyFailed ? <X className="size-4 text-hazard-ink" /> : <Copy className="size-4" />}
            <span aria-live="polite">{copied ? "Copied" : copyFailed ? "Share failed" : "Share"}</span>
          </button>
        </div>
      </div>

      {/* Below md the table's columns cannot both fit and stay readable, and a
          board hidden past the right edge is a board nobody compares. So the
          same rows are dealt out as one card per attribute, each listing every
          board's value down the card. */}
      <div className="md:hidden">
        <StackedComparison
          boards={boards}
          rows={visibleRows}
          onRemove={removeBoard}
        />
      </div>

      <div
        className="comparison-scroll hidden overflow-x-auto rounded-[2px] border border-rule bg-face md:block"
        // A scroll container is only reachable by keyboard if it can hold
        // focus; the attribute column stays pinned while it moves.
        tabIndex={0}
        role="region"
        aria-label="Board comparison table, scrolls horizontally"
      >
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-rule bg-well">
              <th scope="col" className="sticky left-0 z-20 w-40 bg-well p-4 text-xs uppercase tracking-[0.14em] text-faint">Attribute</th>
              {boards.map((board) => (
                <th scope="col" key={board.id} className="min-w-52 p-4 align-top">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/boards/${board.id}`} className="group flex items-center gap-2 font-semibold text-ink text-ink">
                      <VendorLogo vendor={board.vendor} size={22} />{board.name}
                    </Link>
                    <button type="button" onClick={() => removeBoard(board.id)} aria-label={`Remove ${board.name} from comparison`} className="grid size-8 shrink-0 place-items-center rounded-[2px] text-faint hover:bg-raised hover:text-ink"><X className="size-4" /></button>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Link href={`/boards/${board.id}`} className="text-xs text-ink hover:text-ink">Overview</Link>
                    {board.pinout ? <Link href={`/pinout/${board.id}`} className="text-xs text-verified-ink hover:text-ink">Pinout</Link> : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const differs = uniqueValues(row.values) > 1;
              return (
                <tr key={row.label} className="border-b border-rule last:border-0">
                  <th scope="row" className="sticky left-0 z-10 bg-face p-4 text-xs font-medium uppercase tracking-[0.1em] text-faint">{row.label}</th>
                  {row.values.map((value, index) => (
                    <td key={boards[index]?.id} className={clsx("p-4 text-sm leading-6 text-dim", differs && "bg-raised")}>{value || "Not documented"}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {signalRows?.length ? (
        <section className="panel mt-3" aria-labelledby="signal-map">
          <div className="border-b border-rule px-3 py-1.5">
            <h2 id="signal-map" className="silk">
              Where each bus signal lands
            </h2>
          </div>
          <p className="border-b border-rule px-3 py-2 text-[13px] leading-snug text-dim">
            Answers the re-wiring question directly: if a harness is already
            built for one of these boards, this is the pin it moves to on the
            others. Every entry comes from that board&rsquo;s own labels and
            aliases — a board with no match says so rather than borrowing a
            neighbour&rsquo;s answer.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-rule">
                  <th scope="col" className="silk w-28 px-3 py-2">
                    Signal
                  </th>
                  {boards.map((board) => (
                    <th
                      scope="col"
                      key={board.id}
                      className="silk min-w-40 px-3 py-2 !text-dim"
                    >
                      {board.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {signalRows.map((row) => (
                  <tr key={row.signal} className="border-b border-rule last:border-0">
                    <th scope="row" className="data px-3 py-2 text-[12px] font-medium text-ink">
                      {row.signal}
                    </th>
                    {row.values.map((value, index) => (
                      <td
                        key={boards[index]?.id}
                        className={clsx(
                          "data px-3 py-2 text-[12px] leading-snug",
                          value === "Not exposed" || value === "No pin map"
                            ? "text-faint"
                            : "text-dim",
                        )}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}

// The phone comparison: a roster of what is being compared, then one card per
// attribute. Every board is on screen at once at 390px, so nothing depends on
// noticing that a table scrolls sideways.
function StackedComparison({
  boards,
  rows,
  onRemove,
}: {
  boards: Board[];
  rows: Row[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <section
        aria-label="Boards in this comparison"
        className="panel rounded-[2px] p-3"
      >
        <h2 className="px-1 text-xs uppercase tracking-[0.14em] text-faint">
          Comparing {boards.length} boards
        </h2>
        <ul className="mt-2 grid gap-2">
          {boards.map((board) => (
            <li
              key={board.id}
              className="well flex items-center gap-2 rounded-[2px] p-2.5"
            >
              <VendorLogo vendor={board.vendor} size={22} />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/boards/${board.id}`}
                  className="block truncate text-sm font-semibold text-ink"
                >
                  {board.name}
                </Link>
                <div className="mt-0.5 flex gap-3">
                  <Link
                    href={`/boards/${board.id}`}
                    className="text-xs text-ink"
                  >
                    Overview
                  </Link>
                  {board.pinout ? (
                    <Link
                      href={`/pinout/${board.id}`}
                      className="text-xs text-verified-ink"
                    >
                      Pinout
                    </Link>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(board.id)}
                aria-label={`Remove ${board.name} from comparison`}
                className="grid size-10 shrink-0 place-items-center rounded-[2px] text-faint transition hover:bg-raised hover:text-ink"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {rows.map((row) => {
        const differs = uniqueValues(row.values) > 1;
        return (
          <section
            key={row.label}
            className={clsx(
              "rounded-[2px] p-3",
              differs
                ? "border border-rule-strong bg-face"
                : "panel",
            )}
          >
            <div className="flex items-baseline justify-between gap-2 px-1">
              <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-dim">
                {row.label}
              </h2>
              <span
                className={clsx(
                  "shrink-0 font-mono text-[10px] uppercase tracking-[0.1em]",
                  differs ? "text-ink" : "text-faint",
                )}
              >
                {differs ? "Differs" : "Same"}
              </span>
            </div>
            <dl className="mt-2 grid gap-1.5">
              {row.values.map((value, index) => (
                <div
                  key={boards[index]?.id}
                  className="well rounded-[2px] px-2.5 py-2"
                >
                  <dt className="truncate font-mono text-[11px] text-faint">
                    {boards[index]?.name}
                  </dt>
                  <dd className="mt-0.5 text-sm leading-6 text-ink">
                    {value || "Not documented"}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
