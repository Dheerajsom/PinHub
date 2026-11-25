import { readBoundedJson } from "@/lib/bounded-read";
import type { PinIndexBoard } from "@/lib/pin-match";

/** About 1.2 MB today; the cap leaves room to grow without accepting anything. */
export const maxPinIndexBytes = 2_000_000;
export const pinIndexTimeoutMs = 20_000;

let cached: Promise<PinIndexBoard[]> | null = null;
export function loadPinIndex(fetcher: typeof fetch = (input, init) => fetch(input, init)): Promise<PinIndexBoard[]> {
  // Revalidate once per page session: a previous deployment may have cached
  // an older index at this stable URL, including older capability metadata.
  // The timeout covers the body too, so a stalled stream cannot leave the
  // lookup on "Loading" forever; a failure clears the cache so Retry refetches.
  cached ??= fetcher("/api/pins", { cache: "no-cache", signal: AbortSignal.timeout(pinIndexTimeoutMs) }).then(async (response) => {
    if (!response.ok) throw new Error("Pin index unavailable");
    // Same-origin static deployment data; refuse oversized payloads while
    // streaming, before they are buffered, and validate the shape after.
    const payload = await readBoundedJson(response, maxPinIndexBytes, "Pin index too large");
    const { parsePinIndex } = await import("@/lib/pin-index-boundary");
    return parsePinIndex(payload);
  }).catch((error) => { cached = null; throw error; });
  return cached;
}

/** Test hook: forget the session's index. */
export function resetPinIndexCache() {
  cached = null;
}
