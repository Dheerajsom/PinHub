import { createPinIndex } from "@/lib/server/pin-index";
import { catalogCacheHeaders, methodNotAllowed, readOnlyOptions, rejectQuery } from "@/lib/server/read-only-route";

const body = JSON.stringify(createPinIndex());
export function GET(request: Request) {
  return rejectQuery(request) ?? new Response(body, {
    headers: { "Content-Type": "application/json", ...catalogCacheHeaders },
  });
}
export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = readOnlyOptions;
