"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { favoriteLimit, toggleFavorite } from "@/lib/favorites";

const messageVisibleMs = 5000;

/**
 * Toggles a favorite and, when the capacity limit blocks it, reports why for a
 * few seconds. The message used to stay pinned over the results until the next
 * successful toggle, covering the bottom of the list on phones.
 */
export function useFavoriteToggle() {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onToggleFavorite = useCallback((id: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (toggleFavorite(id)) {
      setMessage("");
      return;
    }
    setMessage(
      `Favorite limit reached (${favoriteLimit}). Remove one to add another.`,
    );
    timer.current = setTimeout(() => setMessage(""), messageVisibleMs);
  }, []);

  return { onToggleFavorite, favoriteMessage: message };
}

export function FavoriteLimitToast({ message }: { message: string }) {
  // The live region stays mounted so screen readers announce the message when
  // it appears instead of missing a region that was inserted with its text.
  return (
    <p
      role="status"
      aria-live="polite"
      className={
        message
          ? "favorite-limit-toast fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-lg border border-amber-300/30 bg-[#24201a] p-3 text-sm text-amber-100 shadow-xl"
          : "sr-only"
      }
    >
      {message}
    </p>
  );
}
