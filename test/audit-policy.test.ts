import { describe, expect, it } from "vitest";
import { evaluateAudit, type AuditException } from "../scripts/lib/audit-policy";

const braces = {
  name: "braces",
  severity: "high",
  url: "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm",
  title: "stack exhaustion",
};
const report = {
  vulnerabilities: {
    braces: { severity: "high", via: [braces] },
    micromatch: { severity: "high", via: ["braces"] },
    "eslint-config-next": { severity: "high", via: ["@next/eslint-plugin-next"] },
  },
};
const exception: AuditException = {
  advisory: "GHSA-vfj7-8cjw-p6xm",
  packages: ["braces"],
  reason: "test",
  expires: "2027-01-03",
};

describe("audit policy", () => {
  it("excepts only the named advisory on the named package before it expires", () => {
    expect(evaluateAudit(report, "2026-10-03", [exception])).toEqual({
      blocking: [],
      excepted: ["braces: GHSA-vfj7-8cjw-p6xm (high) stack exhaustion; excepted until 2027-01-03"],
    });
  });

  it("blocks again once the exception expires", () => {
    expect(evaluateAudit(report, "2027-01-04", [exception]).blocking).toEqual([
      "braces: GHSA-vfj7-8cjw-p6xm (high) stack exhaustion; exception expired 2027-01-03",
    ]);
  });

  it("blocks any other high or critical advisory, but not moderate ones", () => {
    const other = {
      vulnerabilities: {
        ...report.vulnerabilities,
        next: {
          severity: "critical",
          via: [
            { name: "next", severity: "critical", url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc" },
            { name: "next", severity: "moderate", url: "https://github.com/advisories/GHSA-dddd-eeee-ffff" },
          ],
        },
        picomatch: {
          severity: "high",
          via: [{ ...braces, name: "picomatch" }],
        },
      },
    };
    expect(evaluateAudit(other, "2026-10-03", [exception]).blocking).toEqual([
      "next: GHSA-aaaa-bbbb-cccc (critical)",
      "picomatch: GHSA-vfj7-8cjw-p6xm (high) stack exhaustion",
    ]);
  });

  it("passes a clean report and fails closed on an unreadable one", () => {
    expect(evaluateAudit({ vulnerabilities: {} }, "2026-10-03")).toEqual({ blocking: [], excepted: [] });
    expect(evaluateAudit(null, "2026-10-03").blocking).toHaveLength(1);
    expect(evaluateAudit({ error: { code: "ENOAUDIT" } }, "2026-10-03").blocking).toHaveLength(1);
  });
});
