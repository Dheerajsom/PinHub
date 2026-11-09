"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  favoriteLimit,
  toggleFavoriteWithOutcome,
  useFavoritesUnsavedGeneration,
} from "@/lib/favorites";

const messageVisibleMs = 5000;

/**
 * Toggles a favorite and, when the capacity limit or an invalid id blocks it,
 * reports why for a few seconds. The message used to stay pinned over the
 * results until the next successful toggle, covering the bottom of the list on
 * phones. A refused storage write is reported separately and stays visible
 * (see `FavoriteLimitToast`), because it describes lasting state, not an event.
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
    const outcome = toggleFavoriteWithOutcome(id);
    if (outcome.status === "stored" || outcome.status === "session") {
      setMessage("");
      return;
    }
    setMessage(
      outcome.status === "limit"
        ? `Favorite limit reached (${favoriteLimit}). Remove one to add another.`
        : "This board can’t be saved as a favorite.",
    );
    timer.current = setTimeout(() => setMessage(""), messageVisibleMs);
  }, []);

  return { onToggleFavorite, favoriteMessage: message };
}

const toastClass =
  "favorite-limit-toast rounded-lg border border-amber-300/30 bg-[#24201a] p-3 text-sm text-amber-100 shadow-xl";

/**
 * Favorite feedback: the short-lived limit message from `useFavoriteToggle`,
 * plus a lasting notice while favorites exist only in memory because the
 * browser refused to store them.
 */
export function FavoriteLimitToast({ message }: { message: string }) {
  const unsavedGeneration = useFavoritesUnsavedGeneration();
  // Dismissing hides the notice for this failure; a later refused write gets a
  // new generation and shows it again. A stored write resets it to 0.
  const [dismissedGeneration, setDismissedGeneration] = useState(0);
  const sessionOnly = unsavedGeneration !== 0 && unsavedGeneration !== dismissedGeneration;

  // Both live regions stay mounted so screen readers announce text when it
  // appears instead of missing a region that was inserted with its text.
  return (
    <div
      className={
        message || sessionOnly
          ? "fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto grid max-w-md gap-2"
          : "sr-only"
      }
    >
      <p role="status" aria-live="polite" className={message ? toastClass : "sr-only"}>
        {message}
      </p>
      <div className={sessionOnly ? `${toastClass} flex items-start gap-2 py-1 pr-1` : "sr-only"}>
        <p role="status" aria-live="polite" className="min-w-0 flex-1 py-2 leading-5">
          {sessionOnly
            ? "Favorites are kept for this visit only. This browser would not store them, so changes are lost after a reload. Allow site storage to keep them."
            : ""}
        </p>
        {sessionOnly ? (
          <button
            type="button"
            onClick={() => setDismissedGeneration(unsavedGeneration)}
            aria-label="Dismiss favorites storage notice"
            className="grid size-11 shrink-0 place-items-center rounded-md hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
