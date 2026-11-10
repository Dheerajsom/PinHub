import type { Board } from "@/lib/boards";
import { searchWithPlanner, boardParam } from "@/lib/plan-params";
import { cleanClaimName, maxClaims, type PinClaim } from "@/lib/planner-claims";
import { verificationSourceFor } from "@/lib/source-trust";
import { displayName, type CheckReport, type CheckedPin } from "./check";
import { dialectLabels, type Dialect } from "./scan";

// Text forms of a pin check: a Markdown report to paste into an issue or a
// forum post, and a planner link that claims the pins the code uses.

const statusWords: Record<CheckedPin["status"], string> = { fix: "Fix", check: "Check", clear: "Clear" };

function oneLine(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Escapes characters that would change a Markdown table or inline code. */
function cell(value: string): string {
  return oneLine(value).replace(/([\\|`*_[\]<>])/g, "\\$1");
}

export function placeText(pin: CheckedPin): string {
  return pin.places
    .map((place) => (place.group ? `${place.group} ${place.position}` : `pin ${place.position}`))
    .join(", ");
}

function lineList(pin: CheckedPin): string {
  return [...new Set(pin.refs.map((ref) => ref.line))].join(", ");
}

export function reportMarkdown(board: Board, report: CheckReport, dialect: Dialect | null): string {
  const source = verificationSourceFor(board);
  const lines = [
    `## PinHub pin check: ${cell(board.name)}`,
    "",
    `${dialect ? `${dialectLabels[dialect]} code. ` : ""}${report.counts.fix} to fix, ${report.counts.check} to check, ${report.counts.clear} clear.`,
    "",
  ];
  if (report.pins.length) {
    lines.push("| Status | Pin | Where | Used as | Lines |", "| --- | --- | --- | --- | --- |");
    for (const pin of report.pins) {
      lines.push(
        `| ${statusWords[pin.status]} | ${cell(displayName(pin.pin))}${pin.pin.mcu?.name && pin.pin.mcu.name !== displayName(pin.pin) ? ` (${cell(pin.pin.mcu.name)})` : ""} | ${cell(placeText(pin))} | ${cell(pin.usages.map((use) => use.label).join(", "))} | ${lineList(pin)} |`,
      );
    }
    lines.push("");
  }
  for (const pin of report.pins) {
    const findings = pin.findings.filter((item) => item.severity !== "note" || pin.status !== "clear");
    if (!findings.length) continue;
    lines.push(`**${cell(displayName(pin.pin))}**`);
    for (const item of findings) {
      lines.push(`- ${cell(item.title)}: ${cell(item.detail)}${item.quote ? ` Source: ${cell(item.quote)}` : ""}`);
    }
    lines.push("");
  }
  if (report.missing.length) {
    lines.push("**Not on this board's map**");
    for (const item of report.missing) lines.push(`- Line ${item.ref.line}, ${cell(item.ref.text)}: ${cell(item.reason)}`);
    lines.push("");
  }
  if (report.unfollowed.length) {
    lines.push("**Not followed**");
    for (const item of report.unfollowed) lines.push(`- Line ${item.line}, ${cell(item.text)}`);
    lines.push("");
  }
  lines.push(
    `Checked against PinHub's source-backed record${source ? ` (${source.url})` : ""}. Verify against the board's documentation before wiring.`,
  );
  return lines.join("\n");
}

/** The name a pin gets in the planner: the constant the code used, else its use. */
function claimName(pin: CheckedPin): string {
  const via = pin.refs.find((ref) => ref.via)?.via;
  return cleanClaimName(via ?? pin.usages.map((use) => use.label).join(" ")) || "in use";
}

export function plannerClaims(report: CheckReport): PinClaim[] {
  const claims: PinClaim[] = [];
  const seen = new Set<string>();
  for (const pin of report.pins) {
    const key = pin.places[0]?.key;
    if (!key || seen.has(key) || ["power", "ground"].includes(pin.pin.role)) continue;
    seen.add(key);
    claims.push({ key, name: claimName(pin) });
    if (claims.length >= maxClaims) break;
  }
  return claims;
}

export function plannerHref(board: Pick<Board, "id">, report: CheckReport): string {
  const search = searchWithPlanner(`?${boardParam}=${encodeURIComponent(board.id)}`, {}, plannerClaims(report));
  return `/planner${search}`;
}
