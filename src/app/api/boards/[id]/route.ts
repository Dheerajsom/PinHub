import { boards } from "@/lib/boards";

const boardsById = new Map(boards.map((board) => [board.id, board]));
const readOnlyAllow = "GET, HEAD, OPTIONS";
const noStoreHeaders = { "Cache-Control": "no-store" };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  return Response.json(board, {
    headers: {
      // Let the deployment CDN retain generated records while browsers
      // revalidate, since the stable URL may contain newer data after deploys.
      "Cache-Control":
        "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

function methodNotAllowed() {
  return Response.json(
    { error: "Method not allowed" },
    {
      status: 405,
      headers: { ...noStoreHeaders, Allow: readOnlyAllow },
    },
  );
}

export function POST() {
  return methodNotAllowed();
}

export function PUT() {
  return methodNotAllowed();
}

export function PATCH() {
  return methodNotAllowed();
}

export function DELETE() {
  return methodNotAllowed();
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { ...noStoreHeaders, Allow: readOnlyAllow },
  });
}
