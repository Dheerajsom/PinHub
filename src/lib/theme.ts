export type Theme = "light" | "dark";

/** Local-storage key for the reader's explicit theme choice. */
export const themeStorageKey = "pinhub.theme";

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
  if (stored === "light" || stored === "dark") return stored;
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

/** Resolves and applies the reader's theme in the browser. */
export function applyStoredTheme() {
  applyTheme(
    resolveTheme(
      () => localStorage.getItem(themeStorageKey),
      () => matchMedia("(prefers-color-scheme: light)").matches,
    ),
  );
}
