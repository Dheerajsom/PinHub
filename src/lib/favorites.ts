"use client";

import { useSyncExternalStore } from "react";

// Favorites are persisted in localStorage and exposed to React through one
// tiny external store. Every surface that shows a star — the catalog rows, the
// discovery cards, and the board page actions — reads and writes this single
// snapshot, so they stay in sync within a tab and across tabs.

const storageKey = "pinhub.favorites";
const emptyFavorites: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();
let snapshot: ReadonlySet<string> | null = null;

function readStoredFavorites(): ReadonlySet<string> {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(storageKey) ?? "[]",
    );
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [],
    );
  } catch {
    // Unavailable or corrupt storage simply means "no favorites yet".
    return new Set();
  }
}

function notifyListeners() {
  for (const listener of listeners) listener();
}

// Keep favorites in sync when another tab writes to the same storage key. A
// null key means the whole store was cleared, which also affects us.
function onStorageEvent(event: StorageEvent) {
  if (event.key !== null && event.key !== storageKey) return;
  snapshot = null; // force a re-read on the next getSnapshot call
  notifyListeners();
}

export function subscribeToFavorites(listener: () => void): () => void {
  if (listeners.size === 0) {
    window.addEventListener("storage", onStorageEvent);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", onStorageEvent);
    }
  };
}

export function getFavoritesSnapshot(): ReadonlySet<string> {
  snapshot ??= readStoredFavorites();
  return snapshot;
}

/** The server has no storage; an empty set keeps hydration deterministic. */
export function getServerFavoritesSnapshot(): ReadonlySet<string> {
  return emptyFavorites;
}

export function toggleFavorite(id: string): void {
  const next = new Set(getFavoritesSnapshot());
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  snapshot = next;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...next]));
  } catch {
    // Persisting is best-effort; the in-memory snapshot still updates.
  }
  notifyListeners();
}

/** Read the favorite ids, re-rendering whenever they change. */
export function useFavorites(): ReadonlySet<string> {
  return useSyncExternalStore(
    subscribeToFavorites,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot,
  );
}
