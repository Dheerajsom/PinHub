"use client";

import { useSyncExternalStore } from "react";
import { maxComparedBoards } from "@/lib/compare-params";

/**
 * The comparison shortlist, held on the device while it is being assembled.
 *
 * The shareable form of a comparison is the `/compare?boards=` URL, and that
 * stays the canonical artifact. This store is the tray you fill while browsing:
 * it survives navigating into a board and back out, which plain component state
 * does not, and it never leaves the device.
 */
const storageKey = "pinhub.compare";
const empty: readonly string[] = [];
const listeners = new Set<() => void>();
let snapshot: readonly string[] | null = null;

function readStored(): readonly string[] {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(storageKey) ?? "[]",
    );
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .slice(0, maxComparedBoards);
  } catch {
    // Unavailable or corrupt storage simply means "nothing shortlisted yet".
    return [];
  }
}

function notify() {
  for (const listener of listeners) listener();
}

function onStorageEvent(event: StorageEvent) {
  if (event.key !== null && event.key !== storageKey) return;
  snapshot = null;
  notify();
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener("storage", onStorageEvent);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", onStorageEvent);
    }
  };
}

function getSnapshot(): readonly string[] {
  snapshot ??= readStored();
  return snapshot;
}

/** The server has no storage; an empty tray keeps hydration deterministic. */
function getServerSnapshot(): readonly string[] {
  return empty;
}

function write(next: readonly string[]) {
  snapshot = next;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Persisting is best-effort; the in-memory snapshot still updates.
  }
  notify();
}

/** Adds or removes a board, capped at the width the comparison table renders. */
export function toggleCompared(id: string): void {
  const current = getSnapshot();
  if (current.includes(id)) {
    write(current.filter((entry) => entry !== id));
    return;
  }
  if (current.length >= maxComparedBoards) return;
  write([...current, id]);
}

export function clearCompared(): void {
  write([]);
}

/** Read the shortlisted ids, re-rendering whenever they change. */
export function useCompared(): readonly string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
