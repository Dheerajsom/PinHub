"use client";

import Link from "next/link";
import { Check, Clock3, Copy, Folder, Trash2, X } from "lucide-react";
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
    <details className="group border-b border-white/10 bg-[#0b0e13]">
      <summary className="mx-auto flex min-h-11 max-w-[1560px] cursor-pointer list-none items-center gap-2 px-4 py-2 text-sm text-zinc-300 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300/70 sm:px-6 lg:px-8 [&::-webkit-details-marker]:hidden">
        <Folder className="size-4 text-cyan-200" aria-hidden="true" />
        <span className="font-medium">Project shelf</span>
        <span className="font-mono text-xs text-zinc-500">
          {recent.length} recent · {library.collections.length} collections
        </span>
        <span className="ml-auto text-xs text-zinc-500 group-open:hidden">Open</span>
        <span className="ml-auto hidden text-xs text-zinc-500 group-open:inline">Close</span>
      </summary>
      <div className="mx-auto grid max-w-[1560px] gap-4 px-4 pb-4 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.7fr)] lg:px-8">
        <section className="surface-panel rounded-lg p-3" aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
            <Clock3 className="size-3.5 text-cyan-200" aria-hidden="true" /> Recently viewed
          </h2>
          {recent.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {recent.map((board) => (
                <Link key={board.id} href={`/boards/${board.id}`} className="surface-well rounded-md px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-cyan-300/40 hover:text-white">
                  {board.name}
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Boards you inspect will appear here, capped at eight.
            </p>
          )}
        </section>

        <section className="surface-panel rounded-lg p-3" aria-labelledby="collections-heading">
          <h2 id="collections-heading" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
            <Folder className="size-3.5 text-amber-200" aria-hidden="true" /> Collections
          </h2>
          {library.collections.length ? (
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {library.collections.map((collection) => (
                <article key={collection.id} className="surface-well rounded-md p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-white">{collection.name}</h3>
                      <p className="mt-0.5 font-mono text-[11px] text-zinc-500">{collection.boardIds.length} boards</p>
                    </div>
                    <div className="flex shrink-0">
                      <button type="button" onClick={() => share(collection.id)} aria-label={`Copy share link for ${collection.name}`} className="grid size-9 place-items-center rounded text-zinc-500 hover:bg-white/[0.06] hover:text-cyan-100">
                        {copiedId === collection.id ? <Check className="size-4 text-emerald-300" /> : <Copy className="size-4" />}
                      </button>
                      <button type="button" onClick={() => removeCollection(collection.id)} aria-label={`Delete ${collection.name}`} className="grid size-9 place-items-center rounded text-zinc-500 hover:bg-red-400/10 hover:text-red-200">
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
                          <li key={id} className="flex items-center gap-1 rounded bg-white/[0.025] pl-2">
                            <Link href={`/boards/${id}`} className="min-w-0 flex-1 truncate py-1.5 text-xs text-zinc-300 hover:text-white">{board.name}</Link>
                            <button type="button" onClick={() => setBoardInCollection(collection.id, id, false)} aria-label={`Remove ${board.name} from ${collection.name}`} className="grid size-8 place-items-center text-zinc-600 hover:text-red-200">
                              <X className="size-3.5" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-500">Empty collection. Add a board from its detail panel.</p>
                  )}
                  <Link href={collectionSharePath(collection)} className="mt-2 inline-flex text-xs text-cyan-200 hover:text-white">Open shareable view</Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Open a board and choose Collection to create a named local set.
            </p>
          )}
        </section>
      </div>
    </details>
  );
}

