"use client";

import Link from "next/link";
import {
  Check,
  Clipboard,
  Code2,
  GitCompareArrows,
  Link2,
  Printer,
  Star,
} from "lucide-react";
import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import type { Board } from "@/lib/boards";
import { boardPinSnippet } from "@/lib/board-utilities";
import { toggleFavorite, useFavorites } from "@/lib/favorites";
import { recordRecentBoard } from "@/lib/personal-library";
import { CollectionButton } from "@/components/CollectionButton";

export function BoardActions({ board }: { board: Board }) {
  const favorite = useFavorites().has(board.id);
  const [copied, setCopied] = useState<"link" | "id" | "snippet" | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snippet = boardPinSnippet(board);

  useEffect(() => {
    recordRecentBoard(board.id);
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, [board.id]);

  async function copy(value: string, kind: "link" | "id" | "snippet") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
    } catch {
      setCopied(null);
      return;
    }
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => toggleFavorite(board.id)} aria-pressed={favorite} className={clsx("inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm transition", favorite ? "border-amber-300/50 bg-amber-300/10 text-amber-100" : "border-white/10 bg-[#15181f] text-zinc-300 hover:text-white")}>
        <Star className={clsx("size-4", favorite && "fill-amber-300")} />{favorite ? "Saved" : "Favorite"}
      </button>
      <CollectionButton id={board.id} name={board.name} />
      <Link href={`/compare?boards=${encodeURIComponent(board.id)}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-3 text-sm text-zinc-300 transition hover:border-cyan-300/50 hover:text-white">
        <GitCompareArrows className="size-4" /> Compare
      </Link>
      <button type="button" onClick={() => copy(location.href, "link")} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-3 text-sm text-zinc-300 transition hover:border-cyan-300/50 hover:text-white">
        {copied === "link" ? <Check className="size-4 text-emerald-300" /> : <Link2 className="size-4" />}{copied === "link" ? "Copied" : "Copy link"}
      </button>
      <button type="button" onClick={() => copy(board.id, "id")} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-3 text-sm text-zinc-300 transition hover:border-cyan-300/50 hover:text-white">
        {copied === "id" ? <Check className="size-4 text-emerald-300" /> : <Clipboard className="size-4" />}{copied === "id" ? "ID copied" : "Copy board ID"}
      </button>
      {snippet ? (
        <button type="button" onClick={() => copy(snippet, "snippet")} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-3 text-sm text-zinc-300 transition hover:border-cyan-300/50 hover:text-white">
          {copied === "snippet" ? <Check className="size-4 text-emerald-300" /> : <Code2 className="size-4" />}{copied === "snippet" ? "Snippet copied" : "Copy pin lookup"}
        </button>
      ) : null}
      <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-3 text-sm text-zinc-300 transition hover:border-cyan-300/50 hover:text-white">
        <Printer className="size-4" /> Print reference
      </button>
    </div>
  );
}
