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

// Personal library as left-rail sections instead of a full-width strip: the
// bench history and named sets sit with the other lookup-scoping controls,
// always visible on desktop and one Filters tap away on phones.
export function LibraryRail({ catalog }: { catalog: BoardSummary[] }) {
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
    <>
      <section className="surface-panel rounded-xl p-3" aria-labelledby="recent-heading">
        <div className="mb-2 flex items-center gap-2 px-1">
          <span className="grid size-7 shrink-0 place-items-center rounded-md border border-white/10 bg-[#0a0c11]">
            <Clock3 className="size-3.5 text-cyan-200" aria-hidden="true" />
          </span>
          <h2 id="recent-heading" className="text-[13px] font-semibold tracking-tight text-white">
            Recently viewed
          </h2>
          {recent.length ? (
            <span className="ml-auto rounded-full bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-zinc-500">
              {recent.length}
            </span>
          ) : null}
        </div>
        {recent.length ? (
          <div className="flex flex-wrap gap-1.5">
            {recent.map((board) => (
              <Link key={board.id} href={`/boards/${board.id}`} className="ph-quick-chip surface-well rounded-lg px-2 py-1 text-xs font-medium text-zinc-300 hover:border-cyan-300/40 hover:text-white">
                {board.name}
              </Link>
            ))}
          </div>
        ) : (
          <p className="px-1 text-xs leading-5 text-zinc-500">
            Boards you inspect will appear here.
          </p>
        )}
      </section>

      <section className="surface-panel rounded-xl p-3" aria-labelledby="collections-heading">
        <div className="mb-2 flex items-center gap-2 px-1">
          <span className="grid size-7 shrink-0 place-items-center rounded-md border border-white/10 bg-[#0a0c11]">
            <Folder className="size-3.5 text-amber-200" aria-hidden="true" />
          </span>
          <h2 id="collections-heading" className="text-[13px] font-semibold tracking-tight text-white">
            Collections
          </h2>
          {library.collections.length ? (
            <span className="ml-auto rounded-full bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-zinc-500">
              {library.collections.length}
            </span>
          ) : null}
        </div>
        {library.collections.length ? (
          <div className="grid gap-2">
            {library.collections.map((collection) => (
              <article key={collection.id} className="surface-well rounded-lg p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-[13px] font-semibold tracking-tight text-white">{collection.name}</h3>
                    <p className="mt-0.5 font-mono text-[11px] tabular-nums text-zinc-500">{collection.boardIds.length} boards</p>
                  </div>
                  <div className="flex shrink-0">
                    <button type="button" onClick={() => share(collection.id)} aria-label={`Copy share link for ${collection.name}`} className="grid size-8 place-items-center rounded-md text-zinc-500 transition hover:bg-white/[0.06] hover:text-cyan-100">
                      {copiedId === collection.id ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />}
                    </button>
                    <button type="button" onClick={() => removeCollection(collection.id)} aria-label={`Delete ${collection.name}`} className="grid size-8 place-items-center rounded-md text-zinc-500 transition hover:bg-red-400/10 hover:text-red-200">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                {collection.boardIds.length ? (
                  <ul className="mt-1.5 grid gap-0.5">
                    {collection.boardIds.map((id) => {
                      const board = boardsById.get(id);
                      if (!board) return null;
                      return (
                        <li key={id} className="flex items-center gap-1 rounded-md bg-white/[0.025] pl-2">
                          <Link href={`/boards/${id}`} className="min-w-0 flex-1 truncate py-1.5 text-xs text-zinc-300 hover:text-white">{board.name}</Link>
                          <button type="button" onClick={() => setBoardInCollection(collection.id, id, false)} aria-label={`Remove ${board.name} from ${collection.name}`} className="grid size-7 place-items-center rounded text-zinc-600 hover:text-red-200">
                            <X className="size-3" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-xs text-zinc-500">Empty — add a board from its detail panel.</p>
                )}
                <Link href={collectionSharePath(collection)} className="mt-1.5 inline-flex text-xs font-medium text-cyan-200 hover:text-white">Open shareable view</Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="px-1 text-xs leading-5 text-zinc-500">
            Open a board and choose Collection to group contenders for your next build.
          </p>
        )}
      </section>
    </>
  );
}
