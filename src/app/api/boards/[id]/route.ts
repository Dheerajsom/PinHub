import { boards } from "@/lib/boards";
import {
  catalogCacheHeaders,
  methodNotAllowed,
  noStoreHeaders,
  readOnlyOptions,
  rejectQuery,
} from "@/lib/server/read-only-route";

const boardsById = new Map(boards.map((board) => [board.id, board]));

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rejected = rejectQuery(request);
  if (rejected) return rejected;

  const { id } = await params;
  const board = boardsById.get(id);

  if (!board) {
    // Unknown ids are intentionally not cached. Long-lived negative cache
    // entries could hide a board added by a later deployment, and arbitrary
    // ids must not create an unbounded CDN cache.
    return Response.json(
      { error: "Board not found" },
      { status: 404, headers: noStoreHeaders },
    );
  }

  return Response.json(board, { headers: catalogCacheHeaders });
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = readOnlyOptions;
