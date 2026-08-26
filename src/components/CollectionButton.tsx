"use client";

import { Check, FolderPlus, Plus, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import {
  createCollection,
  setBoardInCollection,
  usePersonalLibrary,
} from "@/lib/personal-library";

export function CollectionButton({ id, name }: { id: string; name: string }) {
  const library = usePersonalLibrary();
  const [open, setOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createCollection(collectionName, [id])) return;
    setCollectionName("");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-3 text-sm text-zinc-300 transition hover:border-cyan-300/50 hover:text-white"
      >
        <FolderPlus className="size-4" aria-hidden="true" />
        Collection
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label={`Collections for ${name}`}
          className="surface-panel absolute left-0 top-12 z-50 w-72 rounded-lg p-3 shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Add to collection
            </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close collections"
              className="grid size-8 place-items-center rounded text-zinc-500 hover:bg-white/[0.06] hover:text-white"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          {library.collections.length ? (
            <div className="mt-2 grid max-h-48 gap-1 overflow-y-auto">
              {library.collections.map((collection) => {
                const included = collection.boardIds.includes(id);
                return (
                  <button
                    key={collection.id}
                    type="button"
                    onClick={() =>
                      setBoardInCollection(collection.id, id, !included)
                    }
                    aria-pressed={included}
                    className="surface-well flex min-h-10 items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm text-zinc-300 transition hover:border-cyan-300/40 hover:text-white"
                  >
                    <span className="truncate">{collection.name}</span>
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
                maxLength={60}
                placeholder="Robotics boards"
                className="h-10 w-full rounded-md border border-white/10 bg-[#0a0c11] px-3 text-sm text-white outline-none focus:border-cyan-300/60"
              />
            </label>
            <button
              type="submit"
              disabled={!collectionName.trim()}
              className="h-10 rounded-md border border-cyan-300/40 bg-cyan-300/10 px-3 text-sm text-cyan-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Create
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
