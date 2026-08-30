import { describe, expect, it } from "vitest";
import {
  DELETE,
  GET,
  OPTIONS,
  PATCH,
  POST,
  PUT,
} from "@/app/api/boards/[id]/route";
import { boards } from "@/lib/boards";

function requestBoard(id: string) {
  return GET(new Request(`https://pinhub.test/api/boards/${id}`), {
    params: Promise.resolve({ id }),
  });
}

describe("GET /api/boards/[id]", () => {
  it("returns a known board with shared-cache policy", async () => {
    const expected = boards[0];
    const response = await requestBoard(expected.id);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expected);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
    );
  });

  it("returns 404 for an unknown board", async () => {
    const response = await requestBoard("not-a-real-board");

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: "Board not found",
    });
  });

  it.each([
    ["POST", POST],
    ["PUT", PUT],
    ["PATCH", PATCH],
    ["DELETE", DELETE],
  ])("rejects the mutating %s method without caching it", async (_method, handler) => {
    const response = handler();

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET, HEAD, OPTIONS");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: "Method not allowed",
    });
  });

  it("answers OPTIONS without enabling cross-origin access", () => {
    const response = OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Allow")).toBe("GET, HEAD, OPTIONS");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
