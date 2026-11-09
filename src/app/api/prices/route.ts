import { getLivePrices } from "@/lib/server/price-store";
import { methodNotAllowed, readOnlyOptions, rejectQuery } from "@/lib/server/read-only-route";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // A shared response is held at the CDN for 30 seconds. Query variants would
  // each be a separate cache key and a separate invocation, so they are
  // refused before any storage read, as on the catalog routes.
  const rejected = rejectQuery(request);
  if (rejected) return rejected;
  const data = await getLivePrices();
  return Response.json(data, { headers: {
    "Cache-Control": data.source === "shared" ? "public, max-age=0, s-maxage=30" : "no-store",
    "X-Content-Type-Options": "nosniff",
  } });
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = readOnlyOptions;
