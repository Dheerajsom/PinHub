import { describe, expect, it, vi } from "vitest";
import { handlePriceDispatch, minDispatchIntervalMs, priceWorkflowUrl } from "@/lib/server/price-dispatch";
import { POST } from "@/app/api/cron/prices/route";

const secret = "s".repeat(40);
const env = { CRON_SECRET: secret, PRICE_WORKFLOW_TOKEN: "github-test-token" };
const now = Date.parse("2026-10-04T15:00:00Z");
const request = (auth: string | null = `Bearer ${secret}`, path = "/api/cron/prices") =>
  new Request(`https://pinhub.test${path}`, { headers: auth === null ? {} : { authorization: auth } });

function github(latest: { status: string; created_at: string } | null, dispatchStatus = 204) {
  return vi.fn(async (url: string | URL | Request) => String(url).endsWith("/dispatches")
    ? new Response(null, { status: dispatchStatus })
    : Response.json({ workflow_runs: latest ? [latest] : [] }));
}

const run = (status: string, minutesAgo: number) => ({ status, created_at: new Date(now - minutesAgo * 60_000).toISOString() });

describe("price workflow trigger", () => {
  it("dispatches the workflow on main when no recent run exists", async () => {
    const fetcher = github(run("completed", 120));
    const response = await handlePriceDispatch(request(), { env, fetcher, now: () => now, log: () => {} });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "dispatched" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const [url, init] = fetcher.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toBe(`${priceWorkflowUrl}/dispatches`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ ref: "main" });
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer github-test-token");
  });

  it("dispatches when the workflow has never run", async () => {
    const response = await handlePriceDispatch(request(), { env, fetcher: github(null), now: () => now, log: () => {} });
    expect(await response.json()).toEqual({ status: "dispatched" });
  });

  it.each([
    ["an active run", run("in_progress", 90)],
    ["a queued run", run("queued", 1)],
    ["a run inside the interval", run("completed", minDispatchIntervalMs / 60_000 - 1)],
  ])("skips without dispatching for %s", async (_name, latest) => {
    const fetcher = github(latest);
    const response = await handlePriceDispatch(request(), { env, fetcher, now: () => now, log: () => {} });
    expect((await response.json()).status).toBe("skipped");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["no header", null],
    ["a wrong secret", `Bearer ${"x".repeat(40)}`],
    ["the bare secret", secret],
    ["a secret prefix", `Bearer ${secret.slice(0, 20)}`],
  ])("rejects %s before calling GitHub", async (_name, auth) => {
    const fetcher = github(null);
    const response = await handlePriceDispatch(request(auth), { env, fetcher, now: () => now });
    expect(response.status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("stays closed when unconfigured or the secret is too short", async () => {
    for (const partial of [{}, { CRON_SECRET: secret }, { PRICE_WORKFLOW_TOKEN: "t" }, { CRON_SECRET: "short", PRICE_WORKFLOW_TOKEN: "t" }]) {
      const fetcher = github(null);
      const response = await handlePriceDispatch(request("Bearer short"), { env: partial, fetcher, now: () => now });
      expect(response.status).toBe(503);
      expect(fetcher).not.toHaveBeenCalled();
    }
  });

  it("rejects query strings", async () => {
    const response = await handlePriceDispatch(request(undefined, "/api/cron/prices?force=1"), { env, fetcher: github(null), now: () => now });
    expect(response.status).toBe(400);
  });

  it("reports GitHub failures without echoing GitHub's response", async () => {
    const log = vi.fn();
    const lookupFails = vi.fn(async () => new Response("token ghp_secret in body", { status: 401 }));
    const lookup = await handlePriceDispatch(request(), { env, fetcher: lookupFails, now: () => now, log });
    expect(lookup.status).toBe(502);
    expect(await lookup.text()).not.toContain("ghp_secret");

    const dispatch = await handlePriceDispatch(request(), { env, fetcher: github(null, 422), now: () => now, log });
    expect(dispatch.status).toBe(502);

    const malformed = vi.fn(async () => Response.json({ unexpected: true }));
    expect((await handlePriceDispatch(request(), { env, fetcher: malformed, now: () => now, log })).status).toBe(502);
    expect(log.mock.calls.flat().join(" ")).not.toContain("github-test-token");
  });

  it("only accepts GET", () => {
    expect(POST().status).toBe(405);
  });
});
