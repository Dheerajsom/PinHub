"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";
const storageKey = "pinhub.theme";

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const frame = requestAnimationFrame(() => setTheme(currentTheme()));
    return () => cancelAnimationFrame(frame);
  }, []);

  function toggleTheme() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // Theme switching remains usable in private/restricted storage modes.
    }
    setTheme(next);
  }

  const nextLabel = theme === "dark" ? "Use light theme" : "Use dark theme";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={nextLabel}
      title={nextLabel}
      className="ph-chrome-button grid size-10 shrink-0 place-items-center rounded-xl text-zinc-300 transition hover:text-white active:scale-[0.96]"
    >
      {theme === "dark" ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}
