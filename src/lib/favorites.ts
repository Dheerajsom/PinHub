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
  // The re-read replaces any unsaved in-memory changes with what is stored.
  unsavedGeneration = 0;
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

export type FavoriteToggleOutcome =
  /** The change reached localStorage. */
  | { status: "stored"; favorited: boolean }
  /** The change applies for this visit only: the browser refused the write. */
  | { status: "session"; favorited: boolean }
  | { status: "limit" }
  | { status: "invalid" };

// 0 while the in-memory favorites match storage. Each refused write bumps it to
// a new value so a dismissed session-only notice reappears on the next failure.
let unsavedGeneration = 0;
let failedWrites = 0;

/** Toggles a favorite and reports whether the change was stored. */
export function toggleFavoriteWithOutcome(id: string): FavoriteToggleOutcome {
  if (!isBoardId(id)) return { status: "invalid" };
  const next = new Set(getFavoritesSnapshot());
  const favorited = !next.has(id);
  if (favorited) {
    if (next.size >= favoriteLimit) return { status: "limit" };
    next.add(id);
  } else {
    next.delete(id);
  }
  snapshot = next;
  let stored = true;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...next]));
  } catch {
    // Keep the in-memory change for this visit, but never report it as saved.
    stored = false;
  }
  unsavedGeneration = stored ? 0 : ++failedWrites;
  notifyListeners();
  return { status: stored ? "stored" : "session", favorited };
}

/** False means the ID is invalid or storage is already at capacity. */
export function toggleFavorite(id: string): boolean {
  const { status } = toggleFavoriteWithOutcome(id);
  return status === "stored" || status === "session";
}

/**
 * 0 when favorites match storage; otherwise an id for the latest refused
 * write, meaning the current favorites are lost on reload.
 */
export function getFavoritesUnsavedGeneration(): number {
  return unsavedGeneration;
}

function getServerFavoritesUnsavedGeneration(): number {
  return 0;
}

export function useFavoritesUnsavedGeneration(): number {
  return useSyncExternalStore(
    subscribeToFavorites,
    getFavoritesUnsavedGeneration,
    getServerFavoritesUnsavedGeneration,
  );
}

/** Read the favorite ids, re-rendering whenever they change. */
export function useFavorites(): ReadonlySet<string> {
  return useSyncExternalStore(
    subscribeToFavorites,
    getFavoritesSnapshot,
    getServerFavoritesSnapshot,
  );
}
