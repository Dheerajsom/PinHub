import { writeFile } from "node:fs/promises";
import { publishPrices } from "./lib/price-publish";

async function main() {
  let dryRun = false;
  let report: string | undefined;
  const acceptedPrices = new Map<string, number>();
  for (const arg of process.argv.slice(2)) {
    if (arg === "--dry-run") dryRun = true;
    else if (arg.startsWith("--report=")) report = arg.slice(9);
    else if (arg.startsWith("--accept-price=")) {
      const match = /^--accept-price=([a-z0-9-]+):(\d+)$/.exec(arg);
      if (!match || acceptedPrices.has(match[1])) throw new Error("Use --accept-price=<listing-id>:<reviewed-cents> once per listing");
      acceptedPrices.set(match[1], Number(match[2]));
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  const summary = await publishPrices({ dryRun, acceptedPrices, log: console.log });
  if (report) await writeFile(report, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`${summary.checked} checked; ${summary.failed} failed; published: ${summary.published}`);
  if (summary.failed) process.exitCode = 1;
}

main().catch(() => {
  // SDK errors can contain request details. Keep CI failures credential-free.
  console.error("Price publication failed; check Blob configuration, snapshot validation and concurrent runs. No unverified data was published.");
  process.exitCode = 1;
});
