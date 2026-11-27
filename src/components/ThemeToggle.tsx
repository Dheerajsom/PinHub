"use client";

import { Moon, Sun } from "lucide-react";
import { getShownTheme, setThemeChoice, useShownTheme } from "@/lib/theme";

/**
 * The one-tap theme switch in the header. It always sets an explicit theme;
 * the settings panel is where the reader goes back to following the system.
 */
export function ThemeToggle() {
  const theme = useShownTheme();

  function toggleTheme() {
    setThemeChoice(getShownTheme() === "dark" ? "light" : "dark");
  }

  const nextLabel = theme === "dark" ? "Use light theme" : "Use dark theme";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={nextLabel}
      title={nextLabel}
      className="ph-chrome-button grid size-11 shrink-0 place-items-center rounded-xl text-zinc-300 transition hover:text-white active:scale-[0.96]"
    >
      {theme === "dark" ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}
