"use client";

import Link from "next/link";
import { AlertTriangle, Check, Copy, Eye, EyeOff, ExternalLink, Trash2, X } from "lucide-react";
import { clsx } from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Board } from "@/lib/boards";
import { getBoardDiscoveryProfile } from "@/lib/board-discovery";
import { analyzePinConflicts, type PinConflict } from "@/lib/compare-conflicts";
import { compareUrl } from "@/lib/compare-params";
import { VendorLogo } from "@/components/VendorLogo";
import { BoardPriceReference } from "@/components/BoardPriceReference";
import { priceForBoard } from "@/lib/board-prices";

type Row = { label: string; values: string[]; kind?: "price" };
type OptionalBoardData = Board & {
  flash?: string;
  ram?: string;
  gpioCount?: number;
  revisionNotes?: string[];
  memory?: { flash?: string; ram?: string };
  resources?: { flash?: string; ram?: string; gpioCount?: number };
};

const missing = "Not documented in PinHub";

function uniqueValues(values: string[]) {
  return new Set(values.map((value) => value.toLowerCase())).size;
}

function optionalData(board: Board): OptionalBoardData {
  return board as OptionalBoardData;
}

function valueOrMissing(value: string | number | undefined): string {
  return value === undefined || value === "" ? missing : String(value);
}

function memoryValue(board: Board, key: "flash" | "ram"): string {
  const data = optionalData(board);
  return valueOrMissing(data[key] ?? data.memory?.[key] ?? data.resources?.[key]);
}

function gpioValue(board: Board): string {
  const data = optionalData(board);
  return valueOrMissing(data.gpioCount ?? data.resources?.gpioCount);
}

function warningValue(board: Board): string {
  return board.warnings.length ? board.warnings.join("\n") : missing;
}

function revisionValue(board: Board): string {
  const data = optionalData(board);
  if (data.revisionNotes?.length) return data.revisionNotes.join("\n");
  const notes = board.warnings.filter((warning) =>
    /\b(?:revision|rev\.?|variant|version|sku|PW number|hardware v\d)\b/i.test(warning),
  );
  return notes.length ? notes.join("\n") : missing;
}

function documentationValue(board: Board): string {
  return board.sourceLinks.length
    ? board.sourceLinks.map((source) => `${source.type}: ${source.label}`).join("\n")
    : missing;
}

export function CompareTable({ boards }: { boards: Board[] }) {
  const [differencesOnly, setDifferencesOnly] = useState(true);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

  const rows = useMemo<Row[]>(() => {
    const profiles = boards.map(getBoardDiscoveryProfile);
    return [
      { label: "Reference price", kind: "price", values: boards.map((board) => {
        const price = priceForBoard(board.id);
        return price ? JSON.stringify([price.amount, price.currency, price.variant, price.retailer, price.checkedAt]) : "No price recorded";
      }) },
      { label: "Manufacturer", values: boards.map((item) => item.vendor) },
      { label: "Compute class", values: profiles.map((item) => item.computeClass) },
      { label: "Processor", values: boards.map((item) => item.processor) },
      { label: "Power", values: boards.map((item) => item.power) },
      { label: "Logic level", values: boards.map((item) => item.logicLevel) },
      { label: "5 V tolerance", values: profiles.map((item) => item.fiveVoltTolerance) },
      { label: "Flash", values: boards.map((item) => memoryValue(item, "flash")) },
      { label: "RAM", values: boards.map((item) => memoryValue(item, "ram")) },
      { label: "GPIO count", values: boards.map(gpioValue) },
      { label: "Form factor", values: boards.map((item) => item.formFactor) },
      { label: "Wireless", values: profiles.map((item) => item.wireless.join(", ") || "None listed") },
      { label: "Connector ecosystem", values: profiles.map((item) => item.connectorEcosystems.join(", ") || "Board-specific") },
      { label: "Interfaces", values: boards.map((item) => item.interfaces.join(", ") || missing) },
      { label: "In-app pin map", values: boards.map((item) => (item.pinout ? "Available" : "Not available")) },
      { label: "Wiring warnings", values: boards.map(warningValue) },
      { label: "Revision notes", values: boards.map(revisionValue) },
      { label: "Documentation", values: boards.map(documentationValue) },
    ];
  }, [boards]);
  const visibleRows = differencesOnly ? rows.filter((row) => row.kind === "price" || uniqueValues(row.values) > 1) : rows;
  const conflicts = useMemo(() => analyzePinConflicts(boards), [boards]);

  function removeBoard(id: string) {
    window.location.assign(compareUrl(boards.filter((board) => board.id !== id).map((board) => board.id)));
  }

  function clearComparison() {
    window.location.assign(compareUrl([]));
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(location.href); setCopyState("copied"); }
    catch { setCopyState("failed"); }
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopyState("idle"), 1800);
  }

  const copied = copyState === "copied";
  const copyFailed = copyState === "failed";
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-400" role="status" aria-live="polite">{differencesOnly ? `${visibleRows.length} attributes shown · differences and reference prices` : `${rows.length} attributes shown`}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setDifferencesOnly((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-3 text-sm text-zinc-300 transition hover:border-cyan-300/40 hover:text-white">
            {differencesOnly ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}{differencesOnly ? "Show identical" : "Differences only"}
          </button>
          <button type="button" onClick={copyLink} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-3 text-sm text-zinc-300 transition hover:border-cyan-300/40 hover:text-white">
            {copied ? <Check className="size-4 text-emerald-300" aria-hidden="true" /> : copyFailed ? <X className="size-4 text-red-300" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}<span aria-live="polite">{copied ? "Copied" : copyFailed ? "Share failed" : "Share"}</span>
          </button>
          <button type="button" onClick={clearComparison} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-3 text-sm text-zinc-300 transition hover:border-orange-300/40 hover:text-white"><Trash2 className="size-4" aria-hidden="true" /> Clear comparison</button>
        </div>
      </div>

      <ConflictSummary conflicts={conflicts} />

      <div className="mt-4 md:hidden"><StackedComparison boards={boards} rows={visibleRows} onRemove={removeBoard} /></div>
      <div className="comparison-scroll hidden overflow-x-auto rounded-xl border border-white/10 bg-[#11141a] shadow-2xl md:block" tabIndex={0} role="region" aria-label="Board comparison table, scrolls horizontally">
        <table className="w-full min-w-[920px] border-collapse text-left">
          <thead><tr className="border-b border-white/10 bg-[#0c0f14]"><th scope="col" className="sticky left-0 z-20 w-44 bg-[#0c0f14] p-4 text-xs uppercase tracking-[0.14em] text-zinc-500">Attribute</th>{boards.map((board) => <th scope="col" key={board.id} className="min-w-56 p-4 align-top"><BoardHeader board={board} onRemove={removeBoard} /></th>)}</tr></thead>
          <tbody>{visibleRows.map((row) => <DesktopRow key={row.label} row={row} boards={boards} />)}</tbody>
        </table>
      </div>
      <SourceReferences boards={boards} />
    </>
  );
}

function DesktopRow({ row, boards }: { row: Row; boards: Board[] }) {
  const differs = uniqueValues(row.values) > 1;
  return <tr className="border-b border-white/[0.07] last:border-0"><th scope="row" className="sticky left-0 z-10 whitespace-pre-line bg-[#11141a] p-4 text-xs font-medium uppercase tracking-[0.1em] text-zinc-500">{row.label}</th>{row.values.map((value, index) => <td key={boards[index]?.id} className={clsx("whitespace-pre-line p-4 text-sm leading-6 text-zinc-300", differs && "bg-cyan-300/[0.025]")}>{row.kind === "price" ? <BoardPriceReference boardId={boards[index].id} /> : value || missing}</td>)}</tr>;
}

function BoardHeader({ board, onRemove }: { board: Board; onRemove: (id: string) => void }) {
  return <><div className="flex items-start justify-between gap-2"><Link href={`/boards/${board.id}`} className="group flex items-center gap-2 font-semibold text-white hover:text-cyan-100"><VendorLogo vendor={board.vendor} size={22} />{board.name}</Link><button type="button" onClick={() => onRemove(board.id)} aria-label={`Remove ${board.name} from comparison`} className="grid size-8 shrink-0 place-items-center rounded-md text-zinc-600 hover:bg-white/[0.06] hover:text-white"><X className="size-4" aria-hidden="true" /></button></div><div className="mt-2 flex gap-2"><Link href={`/boards/${board.id}`} className="text-xs text-cyan-200 hover:text-white">Overview</Link>{board.pinout ? <Link href={`/pinout/${board.id}`} className="text-xs text-emerald-200 hover:text-white">Pinout</Link> : null}</div></>;
}

function ConflictSummary({ conflicts }: { conflicts: PinConflict[] }) {
  const visibleConflicts = conflicts.slice(0, 3);
  const additionalConflicts = conflicts.slice(3);
  const renderConflict = (item: PinConflict, index: number) => <li key={`${item.kind}-${item.title}-${index}`} className="surface-well rounded-lg px-3 py-2.5 text-sm"><div className="font-medium text-orange-50">{item.title}</div><div className="mt-1 text-xs leading-5 text-zinc-400">{item.detail}</div><div className="mt-1 font-mono text-[11px] text-zinc-500">{item.boards.join(" · ")}</div>{item.pins.length ? <div className="mt-1 text-[11px] text-zinc-500">{item.pins.map((pin) => `${pin.boardName}: ${pin.connector} pin ${pin.pin.position} · ${pin.pin.label}`).join(" | ")}</div> : null}</li>;

  return <section aria-label="Informational pin conflict analysis" className="rounded-xl border border-orange-300/25 bg-[#1b1410] p-4 sm:p-5"><div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-orange-200" aria-hidden="true" /><div><h2 className="font-semibold text-orange-100">Pin-conflict analysis</h2><p className="mt-1 text-xs leading-5 text-orange-100/70">Informational, source-backed candidate risks only. This does not establish electrical compatibility; verify connector orientation, board revision, mux state, voltage, and attached peripherals in the official documentation.</p></div></div>{conflicts.length ? <><p className="mt-3 text-xs font-medium text-orange-100/80">{conflicts.length} candidate {conflicts.length === 1 ? "finding" : "findings"} from available pin metadata</p><ul className="mt-2 grid gap-2">{visibleConflicts.map(renderConflict)}</ul>{additionalConflicts.length ? <details className="mt-2"><summary className="cursor-pointer rounded-lg border border-orange-200/15 px-3 py-2 text-xs font-medium text-orange-100/80 hover:border-orange-200/30 hover:text-orange-50">Show {additionalConflicts.length} more {additionalConflicts.length === 1 ? "finding" : "findings"}</summary><ul className="mt-2 grid gap-2">{additionalConflicts.map((item, index) => renderConflict(item, index + visibleConflicts.length))}</ul></details> : null}</> : <p className="mt-3 text-sm text-zinc-400">No source-backed candidate overlaps were identified in the available pin metadata. Missing metadata is not proof of compatibility.</p>}</section>;
}

function SourceReferences({ boards }: { boards: Board[] }) {
  return <section aria-label="Comparison source references" className="mt-4 rounded-xl border border-white/10 bg-[#11141a] p-4 sm:p-5"><h2 className="text-sm font-semibold text-white">Documentation and source links</h2><p className="mt-1 text-xs text-zinc-500">Links are catalog references; confirm the exact board revision before wiring.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{boards.map((board) => <div key={board.id} className="surface-well rounded-lg p-3"><h3 className="text-sm font-medium text-zinc-200">{board.name}</h3><ul className="mt-2 grid gap-1.5">{board.sourceLinks.length ? board.sourceLinks.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1.5 text-xs leading-5 text-cyan-200 hover:text-white"><span className="shrink-0 rounded border border-white/10 px-1 text-[10px] uppercase text-zinc-500">{source.type}</span><span>{source.label}</span><ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden="true" /></a></li>) : <li className="text-xs text-zinc-500">{missing}</li>}</ul></div>)}</div></section>;
}

function StackedComparison({ boards, rows, onRemove }: { boards: Board[]; rows: Row[]; onRemove: (id: string) => void }) {
  return <div className="space-y-3"><section aria-label="Boards in this comparison" className="surface-panel rounded-xl p-3"><div className="flex items-center justify-between gap-2"><h2 className="px-1 text-xs uppercase tracking-[0.14em] text-zinc-500">Comparing {boards.length} boards</h2><span className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">Shareable set</span></div><ul className="mt-2 grid gap-2">{boards.map((board) => <li key={board.id} className="surface-well flex items-center gap-2 rounded-lg p-2.5"><VendorLogo vendor={board.vendor} size={22} /><div className="min-w-0 flex-1"><Link href={`/boards/${board.id}`} className="block truncate text-sm font-semibold text-white">{board.name}</Link><div className="mt-0.5 flex gap-3"><Link href={`/boards/${board.id}`} className="text-xs text-cyan-200">Overview</Link>{board.pinout ? <Link href={`/pinout/${board.id}`} className="text-xs text-emerald-200">Pinout</Link> : null}</div></div><button type="button" onClick={() => onRemove(board.id)} aria-label={`Remove ${board.name} from comparison`} className="grid size-10 shrink-0 place-items-center rounded-md text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"><X className="size-4" aria-hidden="true" /></button></li>)}</ul></section>{rows.map((row) => { const differs = uniqueValues(row.values) > 1; return <section key={row.label} className={clsx("rounded-xl p-3", differs ? "border border-cyan-300/25 bg-[#101820]" : "surface-panel")}><div className="flex items-baseline justify-between gap-2 px-1"><h2 className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-400">{row.label}</h2><span className={clsx("shrink-0 font-mono text-[10px] uppercase tracking-[0.1em]", differs ? "text-cyan-200/80" : "text-zinc-600")}>{differs ? "Differs" : "Same"}</span></div><dl className="mt-2 grid gap-1.5">{row.values.map((value, index) => <div key={boards[index]?.id} className="surface-well rounded-lg px-2.5 py-2"><dt className="truncate font-mono text-[11px] text-zinc-500">{boards[index]?.name}</dt><dd className="mt-0.5 whitespace-pre-line text-sm leading-6 text-zinc-200">{row.kind === "price" ? <BoardPriceReference boardId={boards[index].id} /> : value || missing}</dd></div>)}</dl></section>; })}</div>;
}
