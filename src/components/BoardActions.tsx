"use client";

import Link from "next/link";
import { Check, GitCompareArrows, Link2, Star } from "lucide-react";
import { clsx } from "clsx";
import { useState, useSyncExternalStore } from "react";

const favoriteKey = "pinhub.favorites";
const listeners = new Set<() => void>();
const serverFavorites: ReadonlySet<string> = new Set();
let snapshot: ReadonlySet<string> | null = null;

function readFavorites(): ReadonlySet<string> {
  if (snapshot === null) {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(favoriteKey) ?? "[]");
      snapshot = new Set(
        Array.isArray(parsed)
          ? parsed.filter((item): item is string => typeof item === "string")
          : [],
      );
    } catch {
      snapshot = new Set();
    }
  }
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function writeFavorites(next: ReadonlySet<string>) {
  snapshot = next;
  try {
    localStorage.setItem(favoriteKey, JSON.stringify([...next]));
  } catch {}
  listeners.forEach((listener) => listener());
}

export function BoardActions({ id, name }: { id: string; name: string }) {
  const stored = useSyncExternalStore(subscribe, readFavorites, () => serverFavorites);
  const favorite = stored.has(id);
  const [copied, setCopied] = useState(false);

  function toggleFavorite() {
    const next = new Set(stored);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    writeFavorites(next);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={toggleFavorite} aria-pressed={favorite} className={clsx("inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm transition", favorite ? "border-amber-300/50 bg-amber-300/10 text-amber-100" : "border-white/10 bg-[#15181f] text-zinc-300 hover:text-white")}>
        <Star className={clsx("size-4", favorite && "fill-amber-300")} />{favorite ? "Saved" : "Favorite"}
      </button>
      <Link href={`/compare?boards=${id}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-3 text-sm text-zinc-300 transition hover:border-cyan-300/50 hover:text-white">
        <GitCompareArrows className="size-4" /> Compare
      </Link>
      <button type="button" onClick={copyLink} className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-3 text-sm text-zinc-300 transition hover:border-cyan-300/50 hover:text-white">
        {copied ? <Check className="size-4 text-emerald-300" /> : <Link2 className="size-4" />}{copied ? "Copied" : `Copy ${name} link`}
      </button>
    </div>
  );
}
