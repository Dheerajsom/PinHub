"use client";

import { Check, FolderPlus } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";
import { collectionLimit, saveCollection, usePersonalLibrary } from "@/lib/personal-library";

export function SaveSharedCollection({ name, boardIds }: { name: string; boardIds: string[] }) {
  // "stored" reached the browser's storage; "session" is kept in memory only
  // because the browser refused the write, so it must not read as saved.
  const [saved, setSaved] = useState<"stored" | "session" | null>(null);
  const library = usePersonalLibrary();
  const atLimit = library.collections.length >= collectionLimit;
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          const result = saveCollection(name, boardIds);
          if (result) setSaved(result.durable ? "stored" : "session");
        }}
        disabled={saved !== null || atLimit}
        // Saved and full are both disabled, but only a completed save may look
        // like success; a full library must not read as "saved".
        className={clsx(
          "inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm transition",
          saved === "stored"
            ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
            : saved === "session" || atLimit
              ? "cursor-not-allowed border-white/10 bg-white/[0.03] text-zinc-500"
              : "border-cyan-300/40 bg-cyan-300/10 text-cyan-50 hover:bg-cyan-300/20",
        )}
      >
        {saved ? <Check className="size-4" aria-hidden="true" /> : <FolderPlus className="size-4" aria-hidden="true" />}
        {saved === "stored" ? "Saved locally" : saved === "session" ? "Kept for this visit" : "Save this collection"}
      </button>
      {saved === "session" ? (
        <p role="status" className="mt-2 text-xs text-zinc-400">
          This browser would not store it, so the collection is gone after a reload. Allow site storage and
          open this link again to keep it.
        </p>
      ) : null}
      {atLimit && saved === null ? (
        <p role="status" className="mt-2 text-xs text-zinc-400">
          You have {collectionLimit} collections. Delete one from the catalog filters before saving another.
        </p>
      ) : null}
    </div>
  );
}

