import { handlePriceDispatch } from "@/lib/server/price-dispatch";
import { methodNotAllowed } from "@/lib/server/read-only-route";

// Starts the hourly price workflow. Called by an outside hourly scheduler and
// by the daily Vercel Cron in vercel.json, both with `Authorization: Bearer
// $CRON_SECRET`.
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handlePriceDispatch(request);
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
