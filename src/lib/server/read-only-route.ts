// Shared response rules for the read-only API (`/api/boards`,
// `/api/boards/[id]`, `/api/pins`, and `/api/prices`). Keeping them in one
// place stops the routes from drifting apart on caching, method handling, or
// query rejection. `/api/prices` sets its own shorter cache lifetime.

const readOnlyAllow = "GET, HEAD, OPTIONS";
export const noStoreHeaders = { "Cache-Control": "no-store" } as const;

/**
 * Catalog records are static per deployment. The CDN may hold them for a day
 * while browsers revalidate, because the stable URL can carry newer data after
 * the next deploy.
 */
export const catalogCacheHeaders = {
  "Cache-Control":
    "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
} as const;

/**
 * Rejects any query string. Records are identified entirely by the path;
 * caching arbitrary query variants would let one record populate an unbounded
 * number of CDN keys.
 */
export function rejectQuery(request: Request): Response | null {
  if (!new URL(request.url).search) return null;
  return Response.json(
    { error: "Query parameters are not supported" },
    { status: 400, headers: noStoreHeaders },
  );
}

export function methodNotAllowed(): Response {
  return Response.json(
    { error: "Method not allowed" },
    { status: 405, headers: { ...noStoreHeaders, Allow: readOnlyAllow } },
  );
}

export function readOnlyOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: { ...noStoreHeaders, Allow: readOnlyAllow },
  });
}
