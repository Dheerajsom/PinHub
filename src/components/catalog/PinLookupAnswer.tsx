"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { BoardSearchEntry } from "@/lib/board-search";
import { isPinLikeQuery, type PinIndexBoard } from "@/lib/pin-match";
import { lookupPins } from "@/lib/pin-lookup";
import { pinLookupHref } from "@/lib/pinout-state";
import { roleChipStyle, roleLabels } from "@/components/board-visual/roles";

let cached: Promise<PinIndexBoard[]> | null = null;
function loadIndex() {
  cached ??= fetch("/api/pins").then(async (response) => {
    if (!response.ok) throw new Error("Pin index unavailable");
    // Same-origin static deployment data; reject malformed or oversized payloads.
    const text = await response.text();
    if (text.length > 2_000_000) throw new Error("Pin index too large");
    const { parsePinIndex } = await import("@/lib/pin-index-boundary");
    return parsePinIndex(JSON.parse(text));
  }).catch((error) => { cached = null; throw error; });
  return cached;
}

export function PinLookupAnswer({ query, search }: { query: string; search: readonly BoardSearchEntry[] }) {
  const enabled = isPinLikeQuery(query);
  const [index, setIndex] = useState<PinIndexBoard[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled || index) return;
    let live = true;
    loadIndex().then((data) => { if (live) { setIndex(data); setFailed(false); } })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [enabled, index, retry]);
  const answer = useMemo(() => index && enabled ? lookupPins(query, search, index) : null, [enabled, index, query, search]);
  if (!enabled) return null;
  return (
    <section aria-label="Pin lookup" className="surface-panel mb-3 min-w-0 rounded-lg p-3.5">
      <h2 className="text-sm font-semibold text-white">Pin lookup</h2>
      <p role="status" className="mt-1 text-xs leading-5 text-zinc-400">
        {failed ? "Pin lookup could not load. Try again." : !answer ? "Loading pin records…" : !answer.boards.length ? "No recorded pins match this query. Try a board and signal, such as pico sda, or an exact label." : "Recorded matches. Open a pin to inspect its connector; verify the linked documentation before wiring."}
      </p>
      {failed ? <button type="button" className="min-h-11 text-sm text-cyan-200" onClick={() => { setFailed(false); setRetry((value) => value + 1); }}>Retry pin lookup</button> : null}
      {answer?.boards.map((board) => (
        <div key={board.id} className="mt-3 min-w-0">
          <h3 className="mb-1 text-sm font-medium text-zinc-200">{board.name}</h3>
          <div className="surface-well divide-y divide-white/10 rounded-md">
            {board.pins.map((pin) => (
              <Link key={pin.key} href={pinLookupHref(board.id, pin.key)} className="block min-h-11 min-w-0 rounded-md px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-cyan-300 hover:bg-white/5">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-mono text-zinc-400">Pin {pin.position}</span>
                  <span className="font-mono font-semibold text-white">{pin.label}</span>
                  <span className="bv-role-chip rounded border px-1.5 text-xs" style={roleChipStyle(pin.role)}>{roleLabels[pin.role]}</span>
                  {pin.net ? <span className="font-mono text-xs text-zinc-300">{pin.net}</span> : null}
                </span>
                {pin.group ? <span className="mt-1 block break-words text-xs text-zinc-500">{pin.group}</span> : null}
                {pin.aliases?.length ? <span className="mt-1 block break-words font-mono text-xs text-zinc-400">{pin.aliases.join(" · ")}</span> : null}
                {pin.note ? <span className="mt-1 block break-words text-xs leading-5 text-orange-300">{pin.note}</span> : null}
                {pin.flags?.length ? <span className="mt-1 block text-xs text-orange-300">Recorded flags: {pin.flags.join(", ")}</span> : null}
              </Link>
            ))}
          </div>
        </div>
      ))}
      {answer?.truncated ? <p className="mt-2 text-xs text-zinc-400">Showing the first matches. Add a board name or a more specific label to narrow the lookup.</p> : null}
    </section>
  );
}
