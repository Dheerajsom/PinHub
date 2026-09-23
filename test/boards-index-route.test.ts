import { describe, expect, it } from "vitest";
import { GET, OPTIONS, POST } from "@/app/api/boards/route";
import { boardIndex } from "@/lib/board-index";
import { boards } from "@/lib/boards";

describe("GET /api/boards", () => {
  it("lists every board with a link to its full record", async () => {
    const response = GET(new Request("https://pinhub.test/api/boards"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    );

    const body = (await response.json()) as ReturnType<typeof boardIndex> extends infer T
      ? { count: number; boards: T }
      : never;
    expect(body.count).toBe(boards.length);
    expect(body.boards.map((entry) => entry.id)).toEqual(boards.map((b) => b.id));
    expect(body.boards[0].url).toBe(`/api/boards/${boards[0].id}`);
  });

  it("keeps pin maps, sources, and prose out of the index payload", () => {
    for (const entry of boardIndex()) {
      expect(entry).not.toHaveProperty("pinout");
      expect(entry).not.toHaveProperty("sourceLinks");
      expect(entry).not.toHaveProperty("description");
    }
    const withPinout = boards.filter((board) => board.pinout).length;
    expect(boardIndex().filter((entry) => entry.hasPinout)).toHaveLength(withPinout);
  });

  it("rejects query variants without populating shared-cache keys", async () => {
    const response = GET(new Request("https://pinhub.test/api/boards?page=2"));
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("is read-only", async () => {
    const response = POST();
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET, HEAD, OPTIONS");
    expect(OPTIONS().status).toBe(204);
  });
});
