"use client";

import { Check, FolderPlus, Plus, X } from "lucide-react";
import { FormEvent, useState } from "react";
import {
  createCollection,
  setBoardInCollection,
  usePersonalLibrary,
} from "@/lib/personal-library";

export function CollectionButton({ id, name }: { id: string; name: string }) {
  const library = usePersonalLibrary();
  const [open, setOpen] = useState(false);
  const [collectionName, setCollectionName] = useState("");

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
        className="inline-flex h-10 items-center gap-2 rounded-[2px] border border-rule bg-face px-3 text-sm text-dim transition hover:text-ink"
      >
        <FolderPlus className="size-4" aria-hidden="true" />
        Collection
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label={`Collections for ${name}`}
          className="panel absolute left-0 top-12 z-50 w-72 rounded-[2px] p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-dim">
              Add to collection
            </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close collections"
              className="grid size-8 place-items-center rounded-[2px] text-faint hover:bg-raised hover:text-ink"
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
                    className="well flex min-h-10 items-center justify-between gap-3 rounded-[2px] px-3 py-2 text-left text-sm text-dim transition border-rule-strong hover:text-ink"
                  >
                    <span className="truncate">{collection.name}</span>
                    {included ? (
                      <Check className="size-4 shrink-0 text-verified-ink" aria-hidden="true" />
                    ) : (
                      <Plus className="size-4 shrink-0 text-faint" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-xs leading-5 text-faint">
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
                className="h-10 w-full rounded-[2px] border border-rule bg-well px-3 text-sm text-ink outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={!collectionName.trim()}
              className="h-10 rounded-[2px] border border-rule-strong bg-raised px-3 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Create
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

