"use client";

import { Check, Plus, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  createCollection,
  collectionBoardLimit,
  collectionLimit,
  collectionNameLimit,
  setBoardInCollection,
  usePersonalLibrary,
} from "@/lib/personal-library";

/**
 * The "Add to collection" dialog. It has no trigger of its own: the board's
 * More menu opens it, and `onClose` hands focus back to that menu button.
 */
export function CollectionPanel({ id, name, onClose }: {
  id: string;
  name: string;
  onClose: () => void;
}) {
  const library = usePersonalLibrary();
  const dialog = useRef<HTMLDivElement>(null);
  const [collectionName, setCollectionName] = useState("");
  const atLimit = library.collections.length >= collectionLimit;

  useEffect(() => {
    dialog.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createCollection(collectionName, [id])) return;
    setCollectionName("");
  }

  return (
    <div
      ref={dialog}
      tabIndex={-1}
      role="dialog"
      aria-label={`Collections for ${name}`}
      className="surface-well col-span-full min-w-0 rounded-lg p-3 outline-none"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Add to collection
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close collections"
          className="grid size-11 shrink-0 place-items-center rounded text-zinc-400 hover:bg-white/[0.06] hover:text-white"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      {library.collections.length ? (
        <div className="mt-2 grid max-h-48 gap-1 overflow-y-auto">
          {library.collections.map((collection) => {
            const included = collection.boardIds.includes(id);
            const full = !included && collection.boardIds.length >= collectionBoardLimit;
            return (
              <button
                key={collection.id}
                type="button"
                onClick={() =>
                  setBoardInCollection(collection.id, id, !included)
                }
                aria-pressed={included}
                disabled={full}
                className="surface-well flex min-h-11 items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm text-zinc-300 transition hover:border-cyan-300/40 hover:text-white"
              >
                <span className="truncate">{collection.name}</span>
                {full ? <span className="shrink-0 text-xs text-zinc-400">Full ({collectionBoardLimit})</span> : null}
                {included ? (
                  <Check className="size-4 shrink-0 text-emerald-300" aria-hidden="true" />
                ) : (
                  <Plus className="size-4 shrink-0 text-zinc-500" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-xs leading-5 text-zinc-500">
          No collections yet. Name one below and this board will be added.
        </p>
      )}
      <form onSubmit={create} className="mt-3 flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">New collection name</span>
          <input
            value={collectionName}
            onChange={(event) => setCollectionName(event.target.value)}
            maxLength={collectionNameLimit}
            placeholder="Robotics boards"
            className="h-11 w-full rounded-md border border-white/10 bg-[#0a0c11] px-3 text-base text-white outline-none focus:border-cyan-300/60 sm:text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={atLimit || !collectionName.trim()}
          className="h-11 rounded-md border border-cyan-300/40 bg-cyan-300/10 px-3 text-sm text-cyan-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Create
        </button>
      </form>
      {atLimit ? <p role="status" className="mt-2 text-xs leading-5 text-zinc-400">You have {collectionLimit} collections. Delete one from the catalog filters to create another.</p> : null}
    </div>
  );
}
