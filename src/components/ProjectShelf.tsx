"use client";

import Link from "next/link";
import { Check, ChevronDown, Clock3, Copy, Folder, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { BoardSummary } from "@/lib/board-summary";
import { collectionSharePath } from "@/lib/collection-params";
import {
  removeCollection,
  setBoardInCollection,
  usePersonalLibrary,
} from "@/lib/personal-library";

export function ProjectShelf({ catalog }: { catalog: BoardSummary[] }) {
  const library = usePersonalLibrary();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const boardsById = useMemo(
    () => new Map(catalog.map((board) => [board.id, board])),
    [catalog],
  );
  const recent = library.recentBoardIds.flatMap((id) => {
    const board = boardsById.get(id);
    return board ? [board] : [];
  });

  async function share(collectionId: string) {
    const collection = library.collections.find((item) => item.id === collectionId);
    if (!collection) return;
    try {
      await navigator.clipboard.writeText(
        `${location.origin}${collectionSharePath(collection)}`,
      );
      setCopiedId(collectionId);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setCopiedId(null);
    }
  }

  return (
    <details className="group border-b border-white/10 bg-[#0b0e13]/80">
      <summary className="mx-auto flex min-h-11 max-w-[1560px] cursor-pointer list-none items-center gap-2.5 px-4 py-2 text-sm text-zinc-300 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300/70 sm:px-6 lg:px-8 [&::-webkit-details-marker]:hidden">
        <span className="grid size-7 place-items-center rounded-md border border-white/10 bg-[#0a0c11]">
          <Folder className="size-3.5 text-cyan-200" aria-hidden="true" />
        </span>
        <span className="text-[13px] font-semibold tracking-tight">Project shelf</span>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] tabular-nums text-zinc-400">
          {recent.length} recent · {library.collections.length} collections
        </span>
        <span className="ml-auto flex items-center gap-1 text-xs text-zinc-500">
          <span className="group-open:hidden">Open</span>
          <span className="hidden group-open:inline">Close</span>
          <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
        </span>
      </summary>
      <div className="mx-auto grid max-w-[1560px] gap-3 px-4 pb-4 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.7fr)] lg:px-8">
        <section className="surface-panel rounded-xl p-3.5" aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            <Clock3 className="size-3.5 text-cyan-200" aria-hidden="true" /> Recently viewed
          </h2>
          {recent.length ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {recent.map((board) => (
                <Link key={board.id} href={`/boards/${board.id}`} className="ph-quick-chip surface-well rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-cyan-300/40 hover:text-white">
                  {board.name}
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Boards you inspect will appear here, capped at eight — your bench memory across sessions.
            </p>
          )}
        </section>

        <section className="surface-panel rounded-xl p-3.5" aria-labelledby="collections-heading">
          <h2 id="collections-heading" className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            <Folder className="size-3.5 text-amber-200" aria-hidden="true" /> Collections
          </h2>
          {library.collections.length ? (
            <div className="mt-2.5 grid gap-2 md:grid-cols-2">
              {library.collections.map((collection) => (
                <article key={collection.id} className="surface-well rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold tracking-tight text-white">{collection.name}</h3>
                      <p className="mt-0.5 font-mono text-[11px] tabular-nums text-zinc-500">{collection.boardIds.length} boards</p>
                    </div>
                    <div className="flex shrink-0">
                      <button type="button" onClick={() => share(collection.id)} aria-label={`Copy share link for ${collection.name}`} className="grid size-9 place-items-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-cyan-100">
                        {copiedId === collection.id ? <Check className="size-4 text-emerald-300" /> : <Copy className="size-4" />}
                      </button>
                      <button type="button" onClick={() => removeCollection(collection.id)} aria-label={`Delete ${collection.name}`} className="grid size-9 place-items-center rounded-lg text-zinc-500 transition hover:bg-red-400/10 hover:text-red-200">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                  {collection.boardIds.length ? (
                    <ul className="mt-2 grid gap-1">
                      {collection.boardIds.map((id) => {
                        const board = boardsById.get(id);
                        if (!board) return null;
                        return (
                          <li key={id} className="flex items-center gap-1 rounded-md bg-white/[0.025] pl-2">
                            <Link href={`/boards/${id}`} className="min-w-0 flex-1 truncate py-1.5 text-xs text-zinc-300 hover:text-white">{board.name}</Link>
                            <button type="button" onClick={() => setBoardInCollection(collection.id, id, false)} aria-label={`Remove ${board.name} from ${collection.name}`} className="grid size-8 place-items-center rounded text-zinc-600 hover:text-red-200">
                              <X className="size-3.5" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-500">Empty collection. Add a board from its detail panel.</p>
                  )}
                  <Link href={collectionSharePath(collection)} className="mt-2 inline-flex text-xs font-medium text-cyan-200 hover:text-white">Open shareable view</Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Open a board and choose Collection to create a named local set — group the contenders for your next build.
            </p>
          )}
        </section>
      </div>
    </details>
  );
}
