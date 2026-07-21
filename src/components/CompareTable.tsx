"use client";

import Link from "next/link";
import { Check, Copy, Eye, EyeOff, X } from "lucide-react";
import { clsx } from "clsx";
import { useMemo, useState } from "react";
import type { Board } from "@/lib/boards";
import { getBoardDiscoveryProfile } from "@/lib/board-discovery";
import { VendorLogo } from "@/components/VendorLogo";

type Row = { label: string; values: string[] };

function uniqueValues(values: string[]) {
  return new Set(values.map((value) => value.toLowerCase())).size;
}

export function CompareTable({ boards }: { boards: Board[] }) {
  const [differencesOnly, setDifferencesOnly] = useState(true);
  const [copied, setCopied] = useState(false);
  const rows = useMemo<Row[]>(() => {
    const profiles = boards.map(getBoardDiscoveryProfile);
    return [
      { label: "Compute class", values: profiles.map((item) => item.computeClass) },
      { label: "Processor", values: boards.map((item) => item.processor) },
      { label: "Logic level", values: boards.map((item) => item.logicLevel) },
      { label: "5 V tolerance", values: profiles.map((item) => item.fiveVoltTolerance) },
      { label: "Power", values: boards.map((item) => item.power) },
      { label: "Form factor", values: boards.map((item) => item.formFactor) },
      { label: "Wireless", values: profiles.map((item) => item.wireless.join(", ") || "None listed") },
      { label: "Connector ecosystem", values: profiles.map((item) => item.connectorEcosystems.join(", ") || "Board-specific") },
      { label: "Interfaces", values: boards.map((item) => item.interfaces.join(", ")) },
      { label: "In-app pin map", values: boards.map((item) => item.pinout ? "Available" : "Not available") },
      { label: "Wiring cautions", values: boards.map((item) => `${item.warnings.length}`) },
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
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">
          {differencesOnly ? `${visibleRows.length} differing attributes shown` : `${rows.length} attributes shown`}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setDifferencesOnly((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-3 text-sm text-zinc-300 transition hover:border-cyan-300/40 hover:text-white">
            {differencesOnly ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            {differencesOnly ? "Show identical" : "Differences only"}
          </button>
          <button type="button" onClick={copyLink} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-3 text-sm text-zinc-300 transition hover:border-cyan-300/40 hover:text-white">
            {copied ? <Check className="size-4 text-emerald-300" /> : <Copy className="size-4" />}{copied ? "Copied" : "Share"}
          </button>
        </div>
      </div>
      <div className="comparison-scroll overflow-x-auto rounded-xl border border-white/10 bg-[#11141a] shadow-2xl">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 bg-[#0c0f14]">
              <th className="sticky left-0 z-20 w-40 bg-[#0c0f14] p-4 text-xs uppercase tracking-[0.14em] text-zinc-500">Attribute</th>
              {boards.map((board) => (
                <th key={board.id} className="min-w-52 p-4 align-top">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/boards/${board.id}`} className="group flex items-center gap-2 font-semibold text-white hover:text-cyan-100">
                      <VendorLogo vendor={board.vendor} size={22} />{board.name}
                    </Link>
                    <button type="button" onClick={() => removeBoard(board.id)} aria-label={`Remove ${board.name} from comparison`} className="grid size-8 shrink-0 place-items-center rounded-md text-zinc-600 hover:bg-white/[0.06] hover:text-white"><X className="size-4" /></button>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Link href={`/boards/${board.id}`} className="text-xs text-cyan-200 hover:text-white">Overview</Link>
                    {board.pinout ? <Link href={`/pinout/${board.id}`} className="text-xs text-emerald-200 hover:text-white">Pinout</Link> : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const differs = uniqueValues(row.values) > 1;
              return (
                <tr key={row.label} className="border-b border-white/[0.07] last:border-0">
                  <th className="sticky left-0 z-10 bg-[#11141a] p-4 text-xs font-medium uppercase tracking-[0.1em] text-zinc-500">{row.label}</th>
                  {row.values.map((value, index) => (
                    <td key={boards[index]?.id} className={clsx("p-4 text-sm leading-6 text-zinc-300", differs && "bg-cyan-300/[0.025]")}>{value || "Not documented"}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
