"use client";

import { Check, FolderPlus } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";
import { collectionLimit, createCollection, usePersonalLibrary } from "@/lib/personal-library";

export function SaveSharedCollection({ name, boardIds }: { name: string; boardIds: string[] }) {
  const [saved, setSaved] = useState(false);
  const library = usePersonalLibrary();
  const atLimit = library.collections.length >= collectionLimit;
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (createCollection(name, boardIds)) setSaved(true);
        }}
        disabled={saved || atLimit}
        // Saved and full are both disabled, but only a completed save may look
        // like success; a full library must not read as "saved".
        className={clsx(
          "inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm transition",
          saved
            ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
            : atLimit
              ? "cursor-not-allowed border-white/10 bg-white/[0.03] text-zinc-500"
              : "border-cyan-300/40 bg-cyan-300/10 text-cyan-50 hover:bg-cyan-300/20",
        )}
      >
        {saved ? <Check className="size-4" aria-hidden="true" /> : <FolderPlus className="size-4" aria-hidden="true" />}
        {saved ? "Saved locally" : "Save this collection"}
      </button>
      {atLimit && !saved ? (
        <p role="status" className="mt-2 text-xs text-zinc-400">
          You have {collectionLimit} collections. Delete one from the catalog filters before saving another.
        </p>
      ) : null}
    </div>
  );
}

