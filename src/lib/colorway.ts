import { useSyncExternalStore } from "react";
import { colorwayStorageKey, defaultColorway, parseColorway, type Colorway } from "@/lib/colorway-options";

export * from "@/lib/colorway-options";

/**
 * Marks the document root the same way the layout script does. The default
 * colorway leaves no attribute, so the stock styles apply untouched.
 */
export function applyColorway(colorway: Colorway, root: HTMLElement = document.documentElement) {
  if (colorway === defaultColorway) delete root.dataset.colorway;
  else root.dataset.colorway = colorway;
}

const listeners = new Set<() => void>();
let snapshot: Colorway | null = null;

function notify() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== colorwayStorageKey) return;
  snapshot = null;
  applyColorway(getColorway());
  notify();
}

export function subscribeToColorway(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function getColorway(): Colorway {
  if (snapshot === null) {
    try {
      snapshot = parseColorway(localStorage.getItem(colorwayStorageKey));
    } catch {
      snapshot = defaultColorway;
    }
  }
  return snapshot;
}

/** Stores and applies a colorway; the default removes the stored key. */
export function setColorway(colorway: Colorway) {
  snapshot = colorway;
  try {
    if (colorway === defaultColorway) localStorage.removeItem(colorwayStorageKey);
    else localStorage.setItem(colorwayStorageKey, colorway);
  } catch {
    // Still applies for this visit.
  }
  applyColorway(colorway);
  notify();
}

export function useColorway(): Colorway {
  return useSyncExternalStore(subscribeToColorway, getColorway, () => defaultColorway);
}
