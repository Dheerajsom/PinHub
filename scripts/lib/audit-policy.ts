// `npm audit` has no ignore list, so CI runs it through this policy instead.
// High and critical advisories fail the build unless an entry below names the
// exact advisory and package, says why it is acceptable, and has not expired.
// An expired entry fails again, so every exception gets revisited.

export type AuditException = {
  advisory: string;
  packages: readonly string[];
  reason: string;
  /** Last day (UTC, YYYY-MM-DD) the exception applies. */
  expires: string;
};

export const auditExceptions: readonly AuditException[] = [
  {
    advisory: "GHSA-vfj7-8cjw-p6xm",
    packages: ["braces"],
    reason:
      "Dev-only: braces 3.0.3 (the latest release, no fix published) reaches the tree through " +
      "eslint-config-next > @next/eslint-plugin-next > fast-glob > micromatch. It only expands the " +
      "lint config's own glob patterns, never user input, and is absent from the production " +
      "bundle. npm's suggested fix is a major downgrade to eslint-config-next 14.",
    expires: "2027-01-03",
  },
];

type Advisory = { name: string; severity: string; url: string; title?: string };
type AuditReport = {
  vulnerabilities?: Record<string, { severity?: string; via?: unknown[] }>;
};

const blockingSeverities = new Set(["high", "critical"]);

function advisoryId(url: string): string {
  return url.slice(url.lastIndexOf("/") + 1);
}

function isAdvisory(value: unknown): value is Advisory {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.name === "string" && typeof item.severity === "string" && typeof item.url === "string";
}

export type AuditVerdict = { blocking: string[]; excepted: string[] };

/**
 * Sorts each high or critical advisory in an `npm audit --json` report into
 * blocking or excepted. Packages flagged only because they depend on a
 * vulnerable package carry no advisory of their own and follow its verdict.
 * A report PinHub cannot read is blocking: the check fails closed.
 */
export function evaluateAudit(
  report: unknown,
  today: string,
  exceptions: readonly AuditException[] = auditExceptions,
): AuditVerdict {
  const vulnerabilities = (report as AuditReport | null)?.vulnerabilities;
  if (!vulnerabilities || typeof vulnerabilities !== "object") {
    return { blocking: ["npm audit did not return a readable report."], excepted: [] };
  }
  const blocking = new Set<string>();
  const excepted = new Set<string>();
  for (const entry of Object.values(vulnerabilities)) {
    for (const via of entry.via ?? []) {
      if (!isAdvisory(via) || !blockingSeverities.has(via.severity)) continue;
      const id = advisoryId(via.url);
      const label = `${via.name}: ${id} (${via.severity})${via.title ? ` ${via.title}` : ""}`;
      const exception = exceptions.find(
        (item) => item.advisory === id && item.packages.includes(via.name),
      );
      if (!exception) blocking.add(label);
      else if (today > exception.expires) blocking.add(`${label}; exception expired ${exception.expires}`);
      else excepted.add(`${label}; excepted until ${exception.expires}`);
    }
  }
  return { blocking: [...blocking].sort(), excepted: [...excepted].sort() };
}
