"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { BoardSearchEntry } from "@/lib/board-search";
import { isPinLikeQuery, pinQueryTokens, type PinIndexBoard } from "@/lib/pin-match";
import { lookupPins, maxLookupBoards, matchedPinSignals, pinMatchKind, type PinLookupResult } from "@/lib/pin-lookup";
import { pinLookupHref } from "@/lib/pinout-state";
import { roleChipStyle, roleLabels } from "@/components/board-visual/roles";

let cached: Promise<PinIndexBoard[]> | null = null;
function loadIndex() {
  // Revalidate once per page session: a previous deployment may have cached
  // an older index at this stable URL, including older capability metadata.
  cached ??= fetch("/api/pins", { cache: "no-cache" }).then(async (response) => {
    if (!response.ok) throw new Error("Pin index unavailable");
    // Same-origin static deployment data; reject malformed or oversized payloads.
    const text = await response.text();
    if (text.length > 2_000_000) throw new Error("Pin index too large");
    const { parsePinIndex } = await import("@/lib/pin-index-boundary");
    return parsePinIndex(JSON.parse(text));
  }).catch((error) => { cached = null; throw error; });
  return cached;
}

export function PinLookupAnswer({ query, search, collapsed = false }: { query: string; search: readonly BoardSearchEntry[]; collapsed?: boolean }) {
  if (!isPinLikeQuery(query)) return null;
  return collapsed ? <CollapsedLookup key={query} query={query} search={search} /> : <LookupContent key={query} query={query} search={search} />;
}

function CollapsedLookup({ query, search }: { query: string; search: readonly BoardSearchEntry[] }) {
  const [open, setOpen] = useState(false);
  return <details onToggle={(event) => setOpen(event.currentTarget.open)} className="surface-panel mb-3 min-w-0 rounded-lg p-3.5">
    <summary className="min-h-11 cursor-pointer text-sm font-semibold text-white">Pin lookup for “{query}”</summary>
    {open ? <LookupContent query={query} search={search} deferred /> : null}
  </details>;
}

function LookupContent({ query, search, deferred = false }: { query: string; search: readonly BoardSearchEntry[]; deferred?: boolean }) {
  const enabled = isPinLikeQuery(query);
  const [index, setIndex] = useState<PinIndexBoard[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [boardLimit, setBoardLimit] = useState(maxLookupBoards);
  useEffect(() => {
    if (!enabled || index) return;
    let live = true;
    loadIndex().then((data) => { if (live) { setIndex(data); setFailed(false); } })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [enabled, index, retry]);
  const answer = useMemo(() => index && enabled ? lookupPins(query, search, index, boardLimit) : null, [enabled, index, query, search, boardLimit]);
  const term = pinQueryTokens(query).at(-1) ?? "";
  if (!enabled) return null;
  return (
    <section aria-label="Pin lookup" className={deferred ? "min-w-0" : "surface-panel mb-3 min-w-0 rounded-lg p-3.5"}>
      {!deferred ? <h2 className="text-sm font-semibold text-white">Pin lookup</h2> : null}
      <p role="status" className="mt-1 text-xs leading-5 text-zinc-400">
        {failed ? "Pin lookup could not load. Try again." : !answer ? "Loading pin records…" : !answer.boards.length ? "No recorded pins match this query. Try a board and signal, such as pico sda, or an exact label. Missing records do not prove a capability is absent." : "Recorded matches, including known alternate functions. Check mux settings, restrictions, and linked documentation before wiring."}
      </p>
      {failed ? <button type="button" className="min-h-11 text-sm text-cyan-200" onClick={() => { setFailed(false); setRetry((value) => value + 1); }}>Retry pin lookup</button> : null}
      {answer?.boards.length ? <>
        <p className="mt-2 text-xs text-zinc-400">{answer.totalBoards} matching {answer.totalBoards === 1 ? "board" : "boards"}. Defaults and labelled pins first; expand a board for alternate routes.</p>
        <div tabIndex={0} role="region" aria-label="Recorded pin matches" className="mt-2 max-h-[min(28rem,55svh)] overflow-y-auto overscroll-contain rounded-md focus-visible:outline-2 focus-visible:outline-cyan-300">
          {answer.boards.map((board) => <BoardMatches key={board.id} board={board} term={term} />)}
          {answer.boards.length < answer.totalBoards ? <button type="button" className="min-h-11 w-full px-3 text-left text-sm text-cyan-200" onClick={() => setBoardLimit((value) => value + maxLookupBoards)}>Show {Math.min(maxLookupBoards, answer.totalBoards - answer.boards.length)} more boards ({answer.boards.length} of {answer.totalBoards} shown)</button> : null}
        </div>
      </> : null}
    </section>
  );
}

const flagLabels: Record<string, string> = {
  strapping: "Boot strap", boot: "Boot restriction", "onboard-led": "Onboard LED", usb: "USB shared",
  "input-only": "Input only", "adc-unavailable-with-wifi": "ADC unavailable with Wi-Fi", "module-memory": "Module memory", jtag: "JTAG shared",
};

function BoardMatches({ board, term }: { board: PinLookupResult["boards"][number]; term: string }) {
  const [expanded, setExpanded] = useState(false);
  const pins = expanded ? board.pins : board.pins.slice(0, 2);
  return <div className="mb-3 min-w-0">
    <h3 className="mb-1 text-sm font-medium text-zinc-200">{board.name} <span className="font-normal text-zinc-500">({board.pinCount} {board.pinCount === 1 ? "pin" : "pins"})</span></h3>
    {board.secondary ? <p className="mb-1 text-xs text-zinc-500">Matched chip or family; board name differs.</p> : null}
    <div className="surface-well divide-y divide-white/10 rounded-md">
      {pins.map((pin) => {
        const kind = pinMatchKind(pin, term);
        const signal = matchedPinSignals(pin, term);
        return <Link key={pin.key} href={pinLookupHref(board.id, pin.key)} className="block min-h-11 min-w-0 rounded-md px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-cyan-300 hover:bg-white/5">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-zinc-400">Pin {pin.position}</span>
            <span className="font-mono font-semibold text-white">{pin.label}</span>
            <span className="text-xs text-cyan-200">{kind === "default" ? "Recorded default" : kind === "alternate" ? "Alternate function" : "Labelled signal"}</span>
            <span className="bv-role-chip rounded border px-1.5 text-xs" style={roleChipStyle(pin.role)}>{roleLabels[pin.role]}</span>
          </span>
          {signal ? <span className="mt-1 block break-words font-mono text-xs text-zinc-400">{signal}</span> : null}
          {pin.group ? <span className="mt-1 block break-words text-xs text-zinc-500">{pin.group}</span> : null}
          {pin.note ? <span className="mt-1 block break-words text-xs leading-5 text-orange-300">{pin.note}</span> : null}
          {pin.flags?.length ? <span className="mt-1 block text-xs text-orange-300">Cautions: {pin.flags.map((flag) => flagLabels[flag] ?? flag.replaceAll("-", " ")).join(", ")}</span> : null}
        </Link>;
      })}
      {board.pins.length > 2 ? <button type="button" aria-expanded={expanded} className="min-h-11 w-full px-3 text-left text-xs text-cyan-200" onClick={() => setExpanded((value) => !value)}>{expanded ? "Show fewer" : `Show ${board.pins.length - 2} more pins`}<span className="sr-only"> for {board.name}</span></button> : null}
      {board.pinCount > board.pins.length ? <Link href={`/pinout/${board.id}`} className="block min-h-11 px-3 py-2 text-xs text-cyan-200">Lookup contains the first {board.pins.length} of {board.pinCount} matches. Open full pinout.</Link> : null}
    </div>
  </div>;
}
