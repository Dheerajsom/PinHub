import { createHash, timingSafeEqual } from "node:crypto";
import { noStoreHeaders, rejectQuery } from "./read-only-route";

// GitHub's own schedule for the price workflow is delayed by hours at a time,
// so an outside scheduler (and a daily Vercel Cron as a backstop) calls this
// route instead. It only asks GitHub to start the existing, audited workflow;
// retailer checks and publishing stay in that one place.
export const priceWorkflowUrl = "https://api.github.com/repos/Dheerajsom/PinHub/actions/workflows/update-prices.yml";

/** A leaked secret or an overlapping schedule can start at most one run per window. */
export const minDispatchIntervalMs = 40 * 60 * 1000;
const minSecretLength = 32;
const githubTimeoutMs = 10_000;
const activeStatuses = new Set(["queued", "in_progress", "waiting", "pending", "requested"]);

export type PriceDispatchOptions = {
  env?: Partial<Record<"CRON_SECRET" | "PRICE_WORKFLOW_TOKEN", string>>;
  fetcher?: typeof fetch;
  now?: () => number;
  log?: (message: string) => void;
};

function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status, headers: noStoreHeaders });
}

/** Compares digests so neither the content nor the length of the secret leaks through timing. */
function authorized(header: string | null, secret: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header ?? ""), digest(`Bearer ${secret}`));
}

function githubHeaders(token: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "PinHub-PriceTrigger/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

type LatestRun = { status: string; createdAt: number } | null;

function latestRun(body: unknown): LatestRun {
  const runs = (body as { workflow_runs?: unknown } | null)?.workflow_runs;
  if (!Array.isArray(runs)) throw new Error("Unexpected workflow run list");
  if (!runs.length) return null;
  const run = runs[0] as { status?: unknown; created_at?: unknown };
  const createdAt = typeof run.created_at === "string" ? Date.parse(run.created_at) : NaN;
  if (typeof run.status !== "string" || !Number.isFinite(createdAt)) throw new Error("Unexpected workflow run");
  return { status: run.status, createdAt };
}

export async function handlePriceDispatch(request: Request, options: PriceDispatchOptions = {}): Promise<Response> {
  const rejected = rejectQuery(request);
  if (rejected) return rejected;
  const env = options.env ?? process.env;
  const secret = env.CRON_SECRET ?? "";
  const token = env.PRICE_WORKFLOW_TOKEN ?? "";
  const log = options.log ?? ((message: string) => console.warn(message));
  if (secret.length < minSecretLength || !token) return json({ error: "Price trigger is not configured" }, 503);
  if (!authorized(request.headers.get("authorization"), secret)) return json({ error: "Unauthorized" }, 401);

  const fetcher = options.fetcher ?? fetch;
  const now = (options.now ?? Date.now)();
  try {
    const runs = await fetcher(`${priceWorkflowUrl}/runs?branch=main&per_page=1`, {
      headers: githubHeaders(token), cache: "no-store", signal: AbortSignal.timeout(githubTimeoutMs),
    });
    if (runs.status !== 200) {
      await runs.body?.cancel();
      log(`Price trigger: run lookup returned HTTP ${runs.status}`);
      return json({ error: "Workflow lookup failed" }, 502);
    }
    const latest = latestRun(await runs.json());
    if (latest && activeStatuses.has(latest.status)) return json({ status: "skipped", reason: "A price check is already running" });
    if (latest && now - latest.createdAt >= 0 && now - latest.createdAt < minDispatchIntervalMs) {
      return json({ status: "skipped", reason: "A price check started recently" });
    }

    const dispatch = await fetcher(`${priceWorkflowUrl}/dispatches`, {
      method: "POST", headers: { ...githubHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ ref: "main" }), cache: "no-store", signal: AbortSignal.timeout(githubTimeoutMs),
    });
    await dispatch.body?.cancel();
    if (dispatch.status < 200 || dispatch.status >= 300) {
      log(`Price trigger: dispatch returned HTTP ${dispatch.status}`);
      return json({ error: "Workflow dispatch failed" }, 502);
    }
    return json({ status: "dispatched" });
  } catch (error) {
    // Never echo GitHub payloads or headers: they can carry token details.
    log(`Price trigger: ${error instanceof Error ? error.name : "unknown error"}`);
    return json({ error: "Workflow trigger failed" }, 502);
  }
}
