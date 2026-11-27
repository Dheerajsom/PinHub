import { useSyncExternalStore } from "react";

/**
 * "system" follows the operating system's reduced-motion setting; "reduce"
 * turns motion down on PinHub even when the system does not ask for it.
 * There is deliberately no way to force motion on: a system that asks for
 * reduced motion is always honored.
 */
export type MotionChoice = "system" | "reduce";

/** Local-storage key; only "reduce" is ever stored. */
export const motionStorageKey = "pinhub.motion";

export function parseMotionChoice(stored: string | null): MotionChoice {
  return stored === "reduce" ? "reduce" : "system";
}

/** Marks the document root the same way the layout script does. */
export function applyMotion(choice: MotionChoice, root: HTMLElement = document.documentElement) {
  if (choice === "reduce") root.dataset.motion = "reduce";
  else delete root.dataset.motion;
}

/**
 * True when motion should be reduced: the reader chose it here, or the
 * operating system asks for it. JS-initiated scrolling uses this, because the
 * CSS `scroll-behavior` rules do not override an explicit JS behavior.
 */
export function prefersReducedMotion(): boolean {
  if (typeof document !== "undefined" && document.documentElement.dataset.motion === "reduce") {
    return true;
  }
  try {
    return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  } catch {
    return false;
  }
}

/** "auto" when motion should be reduced, otherwise "smooth". */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}

const listeners = new Set<() => void>();
let snapshot: MotionChoice | null = null;

function notify() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== motionStorageKey) return;
  snapshot = null;
  applyMotion(getMotionChoice());
  notify();
}

export function subscribeToMotion(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function getMotionChoice(): MotionChoice {
  if (snapshot === null) {
    try {
      snapshot = parseMotionChoice(localStorage.getItem(motionStorageKey));
    } catch {
      snapshot = "system";
    }
  }
  return snapshot;
}

/** Stores and applies a motion choice; "system" removes the stored key. */
export function setMotionChoice(choice: MotionChoice) {
  snapshot = choice;
  try {
    if (choice === "reduce") localStorage.setItem(motionStorageKey, "reduce");
    else localStorage.removeItem(motionStorageKey);
  } catch {
    // Still applies for this visit.
  }
  applyMotion(choice);
  notify();
}

export function useMotionChoice(): MotionChoice {
  return useSyncExternalStore(subscribeToMotion, getMotionChoice, () => "system");
}
