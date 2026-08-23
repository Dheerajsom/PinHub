"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Copy, Star, Trash2, X } from "lucide-react";
import type { BoardSummary } from "@/lib/board-summary";
import { collectionSharePath } from "@/lib/collection-params";
import { toggleFavorite, useFavorites } from "@/lib/favorites";
import {
  removeCollection,
  setBoardInCollection,
  usePersonalLibrary,
} from "@/lib/personal-library";
import { Section } from "@/components/board/BoardBlocks";
import { VendorLogo } from "@/components/VendorLogo";

/**
 * Everything this device remembers: saved boards, recently inspected boards,
 * and named collections. All of it is local storage — nothing is uploaded, and
 * a collection only leaves the device when its share link is copied by hand.
 */
export function LibraryView({ catalog }: { catalog: BoardSummary[] }) {
  const library = usePersonalLibrary();
  const favorites = useFavorites();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareFailed, setShareFailed] = useState(false);

  const boardsById = useMemo(
    () => new Map(catalog.map((board) => [board.id, board])),
    [catalog],
  );
  const saved = useMemo(
    () =>
      [...favorites].flatMap((id) => {
        const board = boardsById.get(id);
        return board ? [board] : [];
      }),
    [boardsById, favorites],
  );
  const recent = useMemo(
    () =>
      library.recentBoardIds.flatMap((id) => {
        const board = boardsById.get(id);
        return board ? [board] : [];
      }),
    [boardsById, library.recentBoardIds],
  );

  async function share(collectionId: string) {
    const collection = library.collections.find((item) => item.id === collectionId);
    if (!collection) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${collectionSharePath(collection)}`,
      );
      setCopiedId(collectionId);
      setShareFailed(false);
      window.setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setCopiedId(null);
      setShareFailed(true);
    }
  }

  return (
    <div className="grid gap-2 lg:grid-cols-2 lg:items-start">
      <Section legend={`Saved boards · ${saved.length}`}>
        {saved.length ? (
          <ul className="grid gap-1">
            {saved.map((board) => (
              <li key={board.id} className="well flex items-center gap-2 px-2.5 py-2">
                <VendorLogo vendor={board.vendor} size={16} />
                <Link
                  href={`/boards/${board.id}`}
                  className="readout min-w-0 flex-1 truncate text-[13px] uppercase text-ink"
                >
                  {board.name}
                </Link>
                <span className="data shrink-0 text-[11px] text-faint">
                  {board.hasPinout ? `${board.pinCount} pins` : "no map"}
                </span>
                <button
                  type="button"
                  onClick={() => toggleFavorite(board.id)}
                  aria-label={`Remove ${board.name} from saved boards`}
                  className="grid size-8 shrink-0 place-items-center text-faint transition-colors hover:text-ink"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] leading-snug text-dim">
            Nothing saved yet.{" "}
            <Link href="/" className="underline underline-offset-2 hover:text-ink">
              Star a board in the index
            </Link>{" "}
            and it will wait here on this device.
          </p>
        )}
      </Section>

      <Section legend={`Recently inspected · ${recent.length}`}>
        {recent.length ? (
          <ul className="flex flex-wrap gap-1">
            {recent.map((board) => (
              <li key={board.id}>
                <Link href={`/boards/${board.id}`} className="chip hover:text-ink">
                  {board.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] leading-snug text-dim">
            The last eight boards you open will be listed here, so you can pick
            up where you left off.
          </p>
        )}
      </Section>

      <Section
        legend={`Collections · ${library.collections.length}`}
        className="lg:col-span-2"
      >
        {shareFailed ? (
          <p className="mb-2 text-[13px] text-hazard-ink" role="status">
            Copying failed — the browser blocked clipboard access. Open the
            collection and copy the address bar instead.
          </p>
        ) : null}

        {library.collections.length ? (
          <ul className="grid gap-2 md:grid-cols-2">
            {library.collections.map((collection) => (
              <li key={collection.id} className="well p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="readout truncate text-[15px] uppercase text-ink">
                      {collection.name}
                    </h3>
                    <p className="data text-[11px] text-faint">
                      {collection.boardIds.length}{" "}
                      {collection.boardIds.length === 1 ? "board" : "boards"}
                    </p>
                  </div>
                  <div className="flex shrink-0">
                    <button
                      type="button"
                      onClick={() => share(collection.id)}
                      aria-label={`Copy the share link for ${collection.name}`}
                      className="grid size-8 place-items-center text-faint transition-colors hover:text-ink"
                    >
                      {copiedId === collection.id ? (
                        <Check className="size-3.5 text-verified" aria-hidden="true" />
                      ) : (
                        <Copy className="size-3.5" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCollection(collection.id)}
                      aria-label={`Delete the collection ${collection.name}`}
                      className="grid size-8 place-items-center text-faint transition-colors hover:text-hazard-ink"
                    >
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
                        <li key={id} className="flex items-center gap-1 bg-raised pl-2">
                          <Link
                            href={`/boards/${id}`}
                            className="min-w-0 flex-1 truncate py-1.5 text-[13px] text-dim transition-colors hover:text-ink"
                          >
                            {board.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => setBoardInCollection(collection.id, id, false)}
                            aria-label={`Remove ${board.name} from ${collection.name}`}
                            className="grid size-8 place-items-center text-faint transition-colors hover:text-ink"
                          >
                            <X className="size-3" aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-[13px] text-faint">
                    Empty. Add a board with the Collection control on its page.
                  </p>
                )}

                <Link
                  href={collectionSharePath(collection)}
                  className="silk mt-1.5 inline-flex transition-colors hover:!text-ink"
                >
                  Open the shareable view
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] leading-snug text-dim">
            No collections yet. Open any board and choose{" "}
            <span className="text-ink">Collection</span> to group boards for a
            project — a build log, a class, a parts shortlist.
          </p>
        )}
      </Section>

      <p className="lg:col-span-2 flex items-start gap-2 text-[11px] leading-snug text-faint">
        <Star className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
        Everything on this page is stored in this browser only. Clearing site
        data removes it, and it never reaches a server.
      </p>
    </div>
  );
}
