import { spawnSync } from "node:child_process";
import { evaluateAudit } from "./lib/audit-policy";

// `npm audit` exits non-zero whenever it finds anything, so its status is
// ignored here and the JSON report decides through the documented policy.
// A fixed command string: the shell resolves npm's launcher on every platform.
const result = spawnSync("npm audit --json", {
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024,
  shell: true,
});

let report: unknown = null;
try {
  report = JSON.parse(result.stdout);
} catch {
  // evaluateAudit reports an unreadable report as blocking.
}

const verdict = evaluateAudit(report, new Date().toISOString().slice(0, 10));
for (const line of verdict.excepted) console.log(`Excepted: ${line}`);
for (const line of verdict.blocking) console.error(`Blocking: ${line}`);
if (verdict.blocking.length) process.exitCode = 1;
else console.log("No blocking high or critical advisories.");
