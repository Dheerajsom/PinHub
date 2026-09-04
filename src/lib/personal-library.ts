"use client";

import { useSyncExternalStore } from "react";

export const personalLibraryStorageKey = "pinhub.library.v1";
export const recentBoardLimit = 8;
export const collectionBoardLimit = 24;
export const collectionLimit = 24;

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

function uniqueIds(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string" || !item.length || item.length > 128) continue;
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
        name: name.slice(0, 60),
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
    return normalizePersonalLibrary(
      JSON.parse(window.localStorage.getItem(personalLibraryStorageKey) ?? "{}"),
    );
  } catch {
    return { ...emptySnapshot };
  }
}

function notify() {
  for (const listener of listeners) listener();
}

function persist(next: PersonalLibrarySnapshot) {
  snapshot = next;
  try {
    window.localStorage.setItem(personalLibraryStorageKey, JSON.stringify(next));
  } catch {
    // The in-memory library remains usable when storage is unavailable.
  }
  notify();
}

function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== personalLibraryStorageKey) return;
  snapshot = null;
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

export function recordRecentBoard(id: string): void {
  const current = getPersonalLibrarySnapshot();
  if (!id || id.length > 128 || current.recentBoardIds[0] === id) return;
  persist({
    ...current,
    recentBoardIds: [id, ...current.recentBoardIds.filter((item) => item !== id)].slice(
      0,
      recentBoardLimit,
    ),
  });
}

export function createCollection(name: string, boardIds: string[] = []): string | null {
  const cleanName = name.trim().slice(0, 60);
  if (!cleanName) return null;
  const current = getPersonalLibrarySnapshot();
  if (current.collections.length >= collectionLimit) return null;
  const now = new Date().toISOString();
  const id = globalThis.crypto?.randomUUID?.() ?? `collection-${Date.now()}`;
  persist({
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
  return id;
}

export function setBoardInCollection(
  collectionId: string,
  boardId: string,
  included: boolean,
): void {
  const current = getPersonalLibrarySnapshot();
  const target = current.collections.find((collection) => collection.id === collectionId);
  if (!target || target.boardIds.includes(boardId) === included) return;
  if (included && (!boardId || boardId.length > 128 || target.boardIds.length >= collectionBoardLimit)) return;
  const now = new Date().toISOString();
  persist({
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
  });
}

export function removeCollection(collectionId: string): void {
  const current = getPersonalLibrarySnapshot();
  if (!current.collections.some((collection) => collection.id === collectionId)) return;
  persist({
    ...current,
    collections: current.collections.filter((item) => item.id !== collectionId),
  });
}

export function restoreCollection(
  collection: LocalBoardCollection,
  originalIndex: number,
): boolean {
  const current = getPersonalLibrarySnapshot();
  const collections = current.collections.filter(
    (item) => item.id !== collection.id,
  );
  // Undo must never evict a different collection created in the meantime.
  if (collections.length >= collectionLimit) return false;
  const index = Math.min(Math.max(originalIndex, 0), collections.length);
  collections.splice(index, 0, collection);
  persist({
    ...current,
    collections,
  });
  return true;
}

export function usePersonalLibrary(): PersonalLibrarySnapshot {
  return useSyncExternalStore(
    subscribeToPersonalLibrary,
    getPersonalLibrarySnapshot,
    getServerPersonalLibrarySnapshot,
  );
}

