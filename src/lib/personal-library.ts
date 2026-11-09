"use client";

import { useSyncExternalStore } from "react";
import { isBoardId } from "@/lib/board-id";
import { collectionNameLimit } from "@/lib/collection-params";

export { collectionNameLimit };

export const personalLibraryStorageKey = "pinhub.library.v1";
export const recentBoardLimit = 8;
export const collectionBoardLimit = 24;
export const collectionLimit = 24;
// A full library (24 collections of 24 ids, names, and timestamps) serializes
// to well under this; anything larger is not something PinHub wrote.
const maxStoredLibraryLength = 128 * 1024;

export type LocalBoardCollection = {
  id: string;
  name: string;
  boardIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type PersonalLibrarySnapshot = {
  version: 1;
  recentBoardIds: string[];
  collections: LocalBoardCollection[];
};

const emptySnapshot: PersonalLibrarySnapshot = {
  version: 1,
  recentBoardIds: [],
  collections: [],
};
const listeners = new Set<() => void>();
let snapshot: PersonalLibrarySnapshot | null = null;
// False once a write is refused, until a later write or a cross-tab re-read
// brings memory and storage back in line.
let durable = true;

/**
 * The result of a library edit. `stored` reached the browser's storage;
 * `session` applies for this visit only. Rejections change nothing.
 */
export type LibraryMutationOutcome =
  | { status: "stored" | "session" }
  | { status: "unchanged" | "missing" | "full" | "invalid" | "limit" };

function uniqueIds(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  for (const item of value) {
    if (!isBoardId(item)) continue;
    ids.add(item);
    if (ids.size === limit) break;
  }
  return [...ids];
}

function validDate(value: unknown, fallback: string): string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
    ? value
    : fallback;
}

export function normalizePersonalLibrary(
  value: unknown,
  now = new Date().toISOString(),
): PersonalLibrarySnapshot {
  if (!value || typeof value !== "object") return { ...emptySnapshot };
  const record = value as Record<string, unknown>;
  const collections: LocalBoardCollection[] = [];
  const collectionIds = new Set<string>();
  if (Array.isArray(record.collections)) {
    for (const item of record.collections) {
      if (!item || typeof item !== "object") continue;
      const candidate = item as Record<string, unknown>;
      const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
      const id = typeof candidate.id === "string" ? candidate.id.trim().slice(0, 128) : "";
      if (!id || !name || collectionIds.has(id)) continue;
      collectionIds.add(id);
      const createdAt = validDate(candidate.createdAt, now);
      collections.push({
        id,
        name: name.slice(0, collectionNameLimit),
        boardIds: uniqueIds(candidate.boardIds, collectionBoardLimit),
        createdAt,
        updatedAt: validDate(candidate.updatedAt, createdAt),
      });
      if (collections.length === collectionLimit) break;
    }
  }

  return {
    version: 1,
    recentBoardIds: uniqueIds(record.recentBoardIds, recentBoardLimit),
    collections,
  };
}

function readStoredLibrary(): PersonalLibrarySnapshot {
  try {
    const raw = window.localStorage.getItem(personalLibraryStorageKey) ?? "{}";
    if (raw.length > maxStoredLibraryLength) return { ...emptySnapshot };
    return normalizePersonalLibrary(JSON.parse(raw));
  } catch {
    return { ...emptySnapshot };
  }
}

function notify() {
  for (const listener of listeners) listener();
}

/**
 * Applies `next` and reports whether it reached storage. When storage is
 * unavailable or full the in-memory library stays usable for this visit, but
 * callers must not tell the user it was saved.
 */
function persist(next: PersonalLibrarySnapshot): boolean {
  snapshot = next;
  let stored = true;
  try {
    window.localStorage.setItem(personalLibraryStorageKey, JSON.stringify(next));
  } catch {
    stored = false;
  }
  durable = stored;
  notify();
  return stored;
}

function written(stored: boolean): LibraryMutationOutcome {
  return { status: stored ? "stored" : "session" };
}

function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== personalLibraryStorageKey) return;
  snapshot = null;
  durable = true;
  notify();
}

export function subscribeToPersonalLibrary(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function getPersonalLibrarySnapshot(): PersonalLibrarySnapshot {
  snapshot ??= readStoredLibrary();
  return snapshot;
}

export function getServerPersonalLibrarySnapshot(): PersonalLibrarySnapshot {
  return emptySnapshot;
}

/** False while the library in memory differs from storage (lost on reload). */
export function getPersonalLibraryDurability(): boolean {
  return durable;
}

function getServerPersonalLibraryDurability(): boolean {
  return true;
}

export function usePersonalLibraryDurability(): boolean {
  return useSyncExternalStore(
    subscribeToPersonalLibrary,
    getPersonalLibraryDurability,
    getServerPersonalLibraryDurability,
  );
}

export function recordRecentBoard(id: string): void {
  const current = getPersonalLibrarySnapshot();
  if (!isBoardId(id) || current.recentBoardIds[0] === id) return;
  persist({
    ...current,
    recentBoardIds: [id, ...current.recentBoardIds.filter((item) => item !== id)].slice(
      0,
      recentBoardLimit,
    ),
  });
}

export function createCollection(name: string, boardIds: string[] = []): string | null {
  return saveCollection(name, boardIds)?.id ?? null;
}

/**
 * Creates a collection and reports whether it was stored (`durable`) or is
 * only kept for this visit because the browser refused the write.
 */
export function saveCollection(
  name: string,
  boardIds: string[] = [],
): { id: string; durable: boolean } | null {
  const cleanName = name.trim().slice(0, collectionNameLimit);
  if (!cleanName) return null;
  const current = getPersonalLibrarySnapshot();
  if (current.collections.length >= collectionLimit) return null;
  const now = new Date().toISOString();
  const id = globalThis.crypto?.randomUUID?.() ?? `collection-${Date.now()}`;
  const durable = persist({
    ...current,
    collections: [
      ...current.collections,
      {
        id,
        name: cleanName,
        boardIds: uniqueIds(boardIds, collectionBoardLimit),
        createdAt: now,
        updatedAt: now,
      },
    ],
  });
  return { id, durable };
}

export function setBoardInCollection(
  collectionId: string,
  boardId: string,
  included: boolean,
): LibraryMutationOutcome {
  const current = getPersonalLibrarySnapshot();
  const target = current.collections.find((collection) => collection.id === collectionId);
  if (!target) return { status: "missing" };
  if (target.boardIds.includes(boardId) === included) return { status: "unchanged" };
  if (included && !isBoardId(boardId)) return { status: "invalid" };
  if (included && target.boardIds.length >= collectionBoardLimit) return { status: "full" };
  const now = new Date().toISOString();
  return written(persist({
    ...current,
    collections: current.collections.map((collection) =>
      collection.id !== collectionId
        ? collection
        : {
            ...collection,
            boardIds: included
              ? uniqueIds([...collection.boardIds, boardId], collectionBoardLimit)
              : collection.boardIds.filter((id) => id !== boardId),
            updatedAt: now,
          },
    ),
  }));
}

export function removeCollection(collectionId: string): LibraryMutationOutcome {
  const current = getPersonalLibrarySnapshot();
  if (!current.collections.some((collection) => collection.id === collectionId)) {
    return { status: "missing" };
  }
  return written(persist({
    ...current,
    collections: current.collections.filter((item) => item.id !== collectionId),
  }));
}

export function restoreCollection(
  collection: LocalBoardCollection,
  originalIndex: number,
): boolean {
  return restoreCollectionWithOutcome(collection, originalIndex).status !== "limit";
}

/** Undo for a deleted collection, reporting whether the restore was stored. */
export function restoreCollectionWithOutcome(
  collection: LocalBoardCollection,
  originalIndex: number,
): LibraryMutationOutcome {
  const current = getPersonalLibrarySnapshot();
  const collections = current.collections.filter(
    (item) => item.id !== collection.id,
  );
  // Undo must never evict a different collection created in the meantime.
  if (collections.length >= collectionLimit) return { status: "limit" };
  const index = Math.min(Math.max(originalIndex, 0), collections.length);
  collections.splice(index, 0, collection);
  return written(persist({
    ...current,
    collections,
  }));
}

export function usePersonalLibrary(): PersonalLibrarySnapshot {
  return useSyncExternalStore(
    subscribeToPersonalLibrary,
    getPersonalLibrarySnapshot,
    getServerPersonalLibrarySnapshot,
  );
}

