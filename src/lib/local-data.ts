import { storedItems } from "@/lib/privacy-storage";

/**
 * Removes every key PinHub keeps in this browser (the list the privacy page
 * shows), then tells each open store to re-read. Returns the keys the browser
 * refused to remove; an empty list means everything is gone.
 *
 * Each store already treats a `storage` event with a null key as "the whole
 * store was cleared", the same signal another tab's `localStorage.clear()`
 * sends, so one synthetic event resets favorites, the library, the pin map
 * tab, the theme, and the motion choice without a reload.
 */
export function clearAllPinhubData(): string[] {
  const refused: string[] = [];
  for (const item of storedItems) {
    try {
      const storage = item.storage === "sessionStorage" ? window.sessionStorage : window.localStorage;
      storage.removeItem(item.key);
    } catch {
      refused.push(item.key);
    }
  }
  try {
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
  } catch {
    // Very old engines without the StorageEvent constructor: stores re-read on
    // the next visit instead.
  }
  return refused;
}
