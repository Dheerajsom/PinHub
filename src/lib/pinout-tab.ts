import { useSyncExternalStore } from "react";

export type PinoutTab = "static" | "dynamic";
export const pinoutTabStorageKey = "pinhub.pinoutTab";
export const defaultPinoutTab: PinoutTab = "dynamic";
export const pinoutTabOrder: readonly PinoutTab[] = ["static", "dynamic"];

export function parsePinoutTab(stored: string | null): PinoutTab {
  return stored === "static" || stored === "dynamic" ? stored : defaultPinoutTab;
}

// The chosen tab is persisted in localStorage and exposed to React through a
// tiny external store (same approach as favorites), which keeps SSR/hydration
// consistent — the server snapshot is always the default. Every board's tab
// control and the settings panel read the same snapshot.
const listeners = new Set<() => void>();
let snapshot: PinoutTab | null = null;

function onStorageEvent(event: StorageEvent) {
  if (event.key !== null && event.key !== pinoutTabStorageKey) return;
  snapshot = null;
  for (const listener of listeners) listener();
}

export function getPinoutTab(): PinoutTab {
  if (snapshot === null) {
    try {
      snapshot = parsePinoutTab(window.localStorage.getItem(pinoutTabStorageKey));
    } catch {
      snapshot = defaultPinoutTab;
    }
  }
  return snapshot;
}

function getServerPinoutTab(): PinoutTab {
  return defaultPinoutTab;
}

export function subscribeToPinoutTab(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener("storage", onStorageEvent);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorageEvent);
  };
}

export function setPinoutTab(next: PinoutTab) {
  snapshot = next;
  try {
    window.localStorage.setItem(pinoutTabStorageKey, next);
  } catch {
    // best-effort
  }
  for (const listener of listeners) listener();
}

export function usePinoutTab(): PinoutTab {
  return useSyncExternalStore(subscribeToPinoutTab, getPinoutTab, getServerPinoutTab);
}
