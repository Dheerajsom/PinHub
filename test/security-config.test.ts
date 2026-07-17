import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("deployment security headers", () => {
  it("keeps HSTS and core browser protections on every route", async () => {
    const rules = await nextConfig.headers?.();
    const headers = new Map(
      (rules ?? []).flatMap((rule) =>
        rule.headers.map((header) => [header.key, header.value] as const),
      ),
    );

    expect(headers.get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
    expect(headers.get("Content-Security-Policy")).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});
