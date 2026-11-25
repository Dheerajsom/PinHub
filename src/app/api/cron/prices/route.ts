import { handlePriceDispatch } from "@/lib/server/price-dispatch";
import { methodNotAllowedFor, noStoreHeaders } from "@/lib/server/read-only-route";

// Starts the hourly price workflow. Called by an outside hourly scheduler and
// by the daily Vercel Cron in vercel.json, both with `Authorization: Bearer
// $CRON_SECRET`.
export const dynamic = "force-dynamic";

// Only GET dispatches. HEAD is exported explicitly because Next otherwise
// answers HEAD by running GET, so an authenticated HEAD would start a run.
const allow = "GET, OPTIONS";
const notAllowed = () => methodNotAllowedFor(allow);

export function GET(request: Request) {
  return handlePriceDispatch(request);
}

/** Next's automatic OPTIONS would list every exported method, including the 405s. */
export function OPTIONS() {
  return new Response(null, { status: 204, headers: { ...noStoreHeaders, Allow: allow } });
}

export const HEAD = notAllowed;
export const POST = notAllowed;
export const PUT = notAllowed;
export const PATCH = notAllowed;
export const DELETE = notAllowed;
