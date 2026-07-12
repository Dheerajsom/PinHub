import { boards } from "@/lib/boards";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return boards.map((board) => ({ id: board.id }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const board = boards.find((candidate) => candidate.id === id);

  if (!board) {
    return Response.json({ error: "Board not found" }, { status: 404 });
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
