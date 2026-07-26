"use client";

import Link from "next/link";
import { Check, GitCompareArrows, Link2, Star } from "lucide-react";
import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { toggleFavorite, useFavorites } from "@/lib/favorites";

export function BoardActions({ id, name }: { id: string; name: string }) {
  const favorite = useFavorites().has(id);
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
    } catch {
      // Clipboard access can be denied; leave the button in its idle state.
      return;
    }
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => toggleFavorite(id)} aria-pressed={favorite} className={clsx("inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm transition", favorite ? "border-amber-300/50 bg-amber-300/10 text-amber-100" : "border-white/10 bg-[#15181f] text-zinc-300 hover:text-white")}>
        <Star className={clsx("size-4", favorite && "fill-amber-300")} />{favorite ? "Saved" : "Favorite"}
      </button>
      <Link href={`/compare?boards=${encodeURIComponent(id)}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-3 text-sm text-zinc-300 transition hover:border-cyan-300/50 hover:text-white">
        <GitCompareArrows className="size-4" /> Compare
      </Link>
      <button type="button" onClick={copyLink} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-3 text-sm text-zinc-300 transition hover:border-cyan-300/50 hover:text-white">
        {copied ? <Check className="size-4 text-emerald-300" /> : <Link2 className="size-4" />}{copied ? "Copied" : `Copy ${name} link`}
      </button>
    </div>
  );
}
