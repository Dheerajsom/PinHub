import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { refreshPriceFile } from "./lib/price-refresh";

async function main() {
  let dryRun = false;
  let report: string | undefined;
  const acceptedPrices = new Map<string, number>();
  for (const arg of process.argv.slice(2)) {
    if (arg === "--dry-run") dryRun = true;
    else if (arg.startsWith("--report=")) report = arg.slice("--report=".length);
    else if (arg.startsWith("--accept-price=")) {
      const match = /^--accept-price=([a-z0-9-]+):(\d+)$/.exec(arg);
      if (!match || acceptedPrices.has(match[1])) throw new Error("Use --accept-price=<listing-id>:<reviewed-cents> once per listing");
      acceptedPrices.set(match[1], Number(match[2]));
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  const dataPath = resolve("src/lib/board-prices.json");
  if (report && resolve(report).toLowerCase() === dataPath.toLowerCase()) throw new Error("Report path must not overwrite the snapshot data");
  const result = await refreshPriceFile(dataPath, { dryRun, acceptedPrices, log: console.log });
  const summary = { dryRun, written: result.written, checked: result.results.length - result.failed, failed: result.failed, results: result.results };
  if (report) await writeFile(report, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`${dryRun ? "Dry run" : "Refresh"}: ${summary.checked} checked, ${summary.failed} failed. ${result.written ? "Snapshots written." : "No file written."}`);
  // Valid listings can be committed by CI, but partial/all failures must remain visible.
  if (result.failed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
