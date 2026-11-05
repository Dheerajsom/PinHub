"use client";

import Link from "next/link";
import { Check, Clock3, Copy, Folder, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { BoardSummary } from "@/lib/board-summary";
import { collectionSharePath } from "@/lib/collection-params";
import {
  collectionLimit,
  removeCollection,
  restoreCollectionWithOutcome,
  setBoardInCollection,
  usePersonalLibrary,
  usePersonalLibraryDurability,
  type LocalBoardCollection,
} from "@/lib/personal-library";

type RemovedCollection = {
  collection: LocalBoardCollection;
  index: number;
  /** False when the browser refused to store the deletion. */
  stored: boolean;
};

const undoVisibleMs = 6000;

function shareUrl(collection: LocalBoardCollection): string {
  return `${location.origin}${collectionSharePath(collection)}`;
}

// Personal library as left-rail sections instead of a full-width strip: the
// bench history and named sets sit with the other lookup-scoping controls,
// always visible on desktop and one Filters tap away on compact layouts.
export function LibraryRail({ catalog }: { catalog: BoardSummary[] }) {
  const library = usePersonalLibrary();
  const durable = usePersonalLibraryDurability();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // A failed copy keeps its recovery link until the next share attempt.
  const [shareFailedId, setShareFailedId] = useState<string | null>(null);
  const [removed, setRemoved] = useState<RemovedCollection | null>(null);
  // Result of the latest rail action. The next action replaces it; no timer
  // clears it before it can be read.
  const [status, setStatus] = useState("");
  const undoTimer = useRef<number | null>(null);
  const copyTimer = useRef<number | null>(null);
  const collectionsRef = useRef<HTMLElement>(null);
  const restoredFocus = useRef(false);
  const boardsById = useMemo(
    () => new Map(catalog.map((board) => [board.id, board])),
    [catalog],
  );
  const recent = library.recentBoardIds.flatMap((id) => {
    const board = boardsById.get(id);
    return board ? [board] : [];
  });
  useEffect(() => {
    if (restoredFocus.current) {
      restoredFocus.current = false;
      collectionsRef.current?.focus();
    }
  }, [library.collections]);

  useEffect(
    () => () => {
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  function stopUndoTimer() {
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    undoTimer.current = null;
  }

  // The Undo toast hides on its own, but not while it is hovered or focused,
  // so keyboard and screen-reader users have time to act on it.
  function startUndoTimer() {
    stopUndoTimer();
    undoTimer.current = window.setTimeout(() => {
      setRemoved(null);
      undoTimer.current = null;
    }, undoVisibleMs);
  }

  function deleteCollection(collection: LocalBoardCollection) {
    const index = library.collections.findIndex(
      (item) => item.id === collection.id,
    );
    const outcome = removeCollection(collection.id);
    if (outcome.status !== "stored" && outcome.status !== "session") return;
    if (shareFailedId === collection.id) setShareFailedId(null);
    setStatus("");
    setRemoved({ collection, index: Math.max(index, 0), stored: outcome.status === "stored" });
    startUndoTimer();
  }

  function undoDelete() {
    if (!removed) return;
    const outcome = restoreCollectionWithOutcome(removed.collection, removed.index);
    if (outcome.status !== "stored" && outcome.status !== "session") return;
    stopUndoTimer();
    restoredFocus.current = true;
    setRemoved(null);
    setStatus(
      outcome.status === "stored"
        ? `Restored ${removed.collection.name}.`
        : `Restored ${removed.collection.name} for this visit only.`,
    );
  }

  function removeBoard(collection: LocalBoardCollection, boardId: string, boardName: string) {
    const outcome = setBoardInCollection(collection.id, boardId, false);
    if (outcome.status === "stored") {
      setStatus(`Removed ${boardName} from ${collection.name}.`);
    } else if (outcome.status === "session") {
      setStatus(`Removed ${boardName} from ${collection.name} for this visit only.`);
    }
  }

  async function share(collection: LocalBoardCollection) {
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    setCopiedId(null);
    setShareFailedId(null);
    try {
      await navigator.clipboard.writeText(shareUrl(collection));
      setCopiedId(collection.id);
      setStatus(`Copied share link for ${collection.name}.`);
      copyTimer.current = window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setShareFailedId(collection.id);
      setStatus(
        `Couldn’t copy the share link for ${collection.name}. Select the link shown under it, or open the shareable view.`,
      );
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
              <Link key={board.id} href={`/boards/${board.id}`} className="ph-quick-chip surface-well inline-flex min-h-11 min-w-11 items-center rounded-lg px-2 py-1 text-xs font-medium text-zinc-300 hover:border-cyan-300/40 hover:text-white">
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

      <section ref={collectionsRef} tabIndex={-1} className="surface-panel rounded-xl p-3 focus-visible:outline-2 focus-visible:outline-cyan-300" aria-labelledby="collections-heading">
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
        {!durable ? (
          <p className="mb-2 px-1 text-xs leading-5 text-zinc-300">
            Kept for this visit only. This browser is not storing your collections or recent boards, so changes are
            lost after a reload. Allow site storage to keep them.
          </p>
        ) : null}
        {/* Always mounted so screen readers announce each new result. */}
        <p role="status" aria-live="polite" className={status ? "mb-2 px-1 text-xs leading-5 text-zinc-400" : "sr-only"}>
          {status}
        </p>
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
                    <button type="button" onClick={() => share(collection)} aria-label={`Copy share link for ${collection.name}`} className="grid size-11 place-items-center rounded-md text-zinc-500 transition hover:bg-white/[0.06] hover:text-cyan-100">
                      {copiedId === collection.id ? <Check className="size-3.5 text-emerald-300" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
                    </button>
                    <button type="button" onClick={() => deleteCollection(collection)} aria-label={`Delete ${collection.name}`} className="grid size-11 place-items-center rounded-md text-zinc-500 transition hover:bg-red-400/10 hover:text-red-200">
                      <Trash2 className="size-3.5" aria-hidden="true" />
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
                          <button type="button" onClick={() => removeBoard(collection, id, board.name)} aria-label={`Remove ${board.name} from ${collection.name}`} className="grid size-11 place-items-center rounded text-zinc-600 hover:text-red-200">
                            <X className="size-3" aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-xs text-zinc-500">Empty — add a board from its detail panel.</p>
                )}
                {shareFailedId === collection.id ? (
                  <label className="mt-1.5 grid gap-1 text-xs leading-5 text-zinc-400">
                    Couldn’t copy. Select this link to copy it:
                    <input
                      readOnly
                      value={shareUrl(collection)}
                      onFocus={(event) => event.currentTarget.select()}
                      className="h-11 w-full min-w-0 rounded-md border border-white/10 bg-[#0a0c11] px-2 font-mono text-xs text-zinc-200 outline-none focus:border-cyan-300/60"
                    />
                  </label>
                ) : null}
                <Link href={collectionSharePath(collection)} className="mt-1.5 inline-flex min-h-11 items-center text-xs font-medium text-cyan-200 hover:text-white">Open shareable view</Link>
              </article>
            ))}
          </div>
        ) : (
          <p className="px-1 text-xs leading-5 text-zinc-500">
            Open a board and choose Collection to group contenders for your next build.
          </p>
        )}
      </section>

      {removed
        ? createPortal(
            <div
              role="region"
              aria-label="Collection deletion"
              onMouseEnter={stopUndoTimer}
              onMouseLeave={startUndoTimer}
              onFocus={stopUndoTimer}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) startUndoTimer();
              }}
              className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-4 rounded-xl border border-white/15 bg-[#1c2029] px-4 py-3 text-sm text-zinc-200 shadow-2xl"
            >
              <span className="min-w-0" role="status" aria-live="polite">
                <span className="block truncate">
                  Deleted <span className="font-semibold text-white">{removed.collection.name}</span>
                </span>
                {removed.stored ? null : (
                  <span className="block text-xs leading-5 text-zinc-400">
                    For this visit only. It returns after a reload.
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={undoDelete}
                disabled={library.collections.length >= collectionLimit}
                className="min-h-11 shrink-0 rounded-lg bg-cyan-300/15 px-3 font-semibold text-cyan-100 transition hover:bg-cyan-300/25 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              >
                {library.collections.length >= collectionLimit ? "Library full" : "Undo"}
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
