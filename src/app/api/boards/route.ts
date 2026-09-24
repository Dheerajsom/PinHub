import { boardIndex } from "@/lib/board-index";
import { boards } from "@/lib/boards";
import {
  catalogCacheHeaders,
  methodNotAllowed,
  readOnlyOptions,
  rejectQuery,
} from "@/lib/server/read-only-route";

// The catalog is static data: build the index once per server instance and
// let the deployment CDN hold it, like the per-board records.
const indexBody = JSON.stringify({ count: boards.length, boards: boardIndex() });

export function GET(request: Request) {
  return (
    rejectQuery(request) ??
    new Response(indexBody, {
      headers: { "Content-Type": "application/json", ...catalogCacheHeaders },
    })
  );
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = readOnlyOptions;
