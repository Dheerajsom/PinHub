import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
/** What the reader picked: a fixed theme, or whatever the operating system says. */
export type ThemeChoice = Theme | "system";

/** Local-storage key for the reader's explicit theme choice. */
export const themeStorageKey = "pinhub.theme";

/** The stored value when it is one of the two known themes, otherwise "system". */
export function parseThemeChoice(stored: string | null): ThemeChoice {
  return stored === "light" || stored === "dark" ? stored : "system";
}

/**
 * The theme to show: the stored choice when it is one of the two known
 * values, otherwise the operating system preference. Storage that throws
 * (private modes, blocked site data) falls back the same way.
 */
export function resolveTheme(
  readStored: () => string | null,
  prefersLight: () => boolean,
): Theme {
  let stored: string | null = null;
  try {
    stored = readStored();
  } catch {
    stored = null;
  }
  const choice = parseThemeChoice(stored);
  if (choice !== "system") return choice;
  try {
    return prefersLight() ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/** Applies a theme to the document root the same way the layout script does. */
export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement) {
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

function readStoredTheme(): string | null {
  return localStorage.getItem(themeStorageKey);
}

function systemPrefersLight(): boolean {
  return matchMedia("(prefers-color-scheme: light)").matches;
}

/** Resolves and applies the reader's theme in the browser. */
export function applyStoredTheme() {
  applyTheme(resolveTheme(readStoredTheme, systemPrefersLight));
}

// One small external store shared by the header toggle and the settings
// panel, so both always agree. Its snapshot is the stored choice; the theme
// actually shown is read from the document root, which the layout script set
// before hydration.
const listeners = new Set<() => void>();
let choiceSnapshot: ThemeChoice | null = null;
let systemQuery: MediaQueryList | null = null;

function notify() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== themeStorageKey) return;
  choiceSnapshot = null;
  applyStoredTheme();
  notify();
}

// While the reader follows the system, a change in the OS setting (a sunset
// schedule, say) repaints the page without a reload.
function onSystemChange() {
  if (getThemeChoice() !== "system") return;
  applyStoredTheme();
  notify();
}

export function subscribeToTheme(listener: () => void): () => void {
  if (listeners.size === 0) {
    window.addEventListener("storage", onStorage);
    try {
      systemQuery = matchMedia("(prefers-color-scheme: light)");
      systemQuery.addEventListener?.("change", onSystemChange);
    } catch {
      systemQuery = null;
    }
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", onStorage);
      systemQuery?.removeEventListener?.("change", onSystemChange);
      systemQuery = null;
    }
  };
}

export function getThemeChoice(): ThemeChoice {
  if (choiceSnapshot === null) {
    try {
      choiceSnapshot = parseThemeChoice(readStoredTheme());
    } catch {
      choiceSnapshot = "system";
    }
  }
  return choiceSnapshot;
}

export function getShownTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/**
 * Stores and applies a theme choice. "system" removes the stored key, so the
 * page follows the operating system again. A refused write still applies the
 * theme for this visit.
 */
export function setThemeChoice(choice: ThemeChoice) {
  choiceSnapshot = choice;
  try {
    if (choice === "system") localStorage.removeItem(themeStorageKey);
    else localStorage.setItem(themeStorageKey, choice);
  } catch {
    // Theme switching remains usable in private/restricted storage modes.
  }
  let shown: Theme = "dark";
  if (choice !== "system") {
    shown = choice;
  } else {
    try {
      shown = systemPrefersLight() ? "light" : "dark";
    } catch {
      shown = "dark";
    }
  }
  applyTheme(shown);
  notify();
}

export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribeToTheme, getThemeChoice, () => "system");
}

export function useShownTheme(): Theme {
  return useSyncExternalStore(subscribeToTheme, getShownTheme, () => "dark");
}
