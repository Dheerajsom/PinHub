"use client";

import { useSyncExternalStore } from "react";
import { isBoardId } from "@/lib/board-id";

// Favorites are persisted in localStorage and exposed to React through one
// tiny external store. Every surface that shows a star — the catalog rows, the
// discovery cards, and the board page actions — reads and writes this single
// snapshot, so they stay in sync within a tab and across tabs.

const storageKey = "pinhub.favorites";
export const favoriteLimit = 256;
const maxStoredFavoritesLength = 64 * 1024;
const emptyFavorites: ReadonlySet<string> = new Set();
const listeners = new Set<() => void>();
let snapshot: ReadonlySet<string> | null = null;

function readStoredFavorites(): ReadonlySet<string> {
  try {
    const raw = window.localStorage.getItem(storageKey) ?? "[]";
    if (raw.length > maxStoredFavoritesLength) return new Set();
    const parsed: unknown = JSON.parse(raw);
    const ids = new Set<string>();
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (!isBoardId(item)) continue;
        ids.add(item);
        if (ids.size === favoriteLimit) break;
      }
    }
    return ids;
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

/** False means the ID is invalid or storage is already at capacity. */
export function toggleFavorite(id: string): boolean {
  if (!isBoardId(id)) return false;
  const next = new Set(getFavoritesSnapshot());
  if (next.has(id)) {
    next.delete(id);
  } else {
    if (next.size >= favoriteLimit) return false;
    next.add(id);
  }
  snapshot = next;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...next]));
  } catch {
    // Persisting is best-effort; the in-memory snapshot still updates.
  }
  notifyListeners();
  return true;
}

/** Read the favorite ids, re-rendering whenever they change. */
export function useFavorites(): ReadonlySet<string> {
  return useSyncExternalStore(
    subscribeToFavorites,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot,
  );
}
