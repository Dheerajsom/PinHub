import { boardIndex } from "@/lib/board-index";
import { boards } from "@/lib/boards";

// The catalog is static data: build the index once per server instance and
// let the deployment CDN hold it, like the per-board records.
const indexBody = JSON.stringify({ count: boards.length, boards: boardIndex() });

const readOnlyAllow = "GET, HEAD, OPTIONS";
const noStoreHeaders = { "Cache-Control": "no-store" };

export function GET(request: Request) {
  if (new URL(request.url).search) {
    // Same rule as /api/boards/[id]: query variants would otherwise each
    // become their own CDN cache key for identical content.
    return Response.json(
      { error: "Query parameters are not supported" },
      { status: 400, headers: noStoreHeaders },
    );
  }

  return new Response(indexBody, {
    headers: {
      "Content-Type": "application/json",
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
