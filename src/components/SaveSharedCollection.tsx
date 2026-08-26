"use client";

import { Check, FolderPlus } from "lucide-react";
import { useState } from "react";
import { createCollection } from "@/lib/personal-library";

export function SaveSharedCollection({ name, boardIds }: { name: string; boardIds: string[] }) {
  const [saved, setSaved] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        if (createCollection(name, boardIds)) setSaved(true);
      }}
      disabled={saved}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-3 text-sm text-cyan-50 transition hover:bg-cyan-300/20 disabled:border-emerald-300/40 disabled:bg-emerald-300/10 disabled:text-emerald-100"
    >
      {saved ? <Check className="size-4" /> : <FolderPlus className="size-4" />}
      {saved ? "Saved locally" : "Save this collection"}
    </button>
  );
}

