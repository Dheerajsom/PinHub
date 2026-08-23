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
      className="inline-flex h-10 items-center gap-2 rounded-[2px] border border-rule-strong bg-raised px-3 text-sm text-ink transition disabled:border-verified/55 disabled:bg-verified-wash disabled:text-verified-ink"
    >
      {saved ? <Check className="size-4" /> : <FolderPlus className="size-4" />}
      {saved ? "Saved locally" : "Save this collection"}
    </button>
  );
}

