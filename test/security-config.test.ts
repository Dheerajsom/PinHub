import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

function repositoryFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

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
    expect(headers.get("Content-Security-Policy")).toContain("base-uri 'none'");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
    expect(headers.get("Cross-Origin-Resource-Policy")).toBe("same-origin");
    expect(headers.get("X-Permitted-Cross-Domain-Policies")).toBe("none");
  });

  it("keeps CI tokens ephemeral and audits every installed dependency", () => {
    const web = repositoryFile(".github/workflows/web-ci.yml");
    const cli = repositoryFile(".github/workflows/cli-ci.yml");

    for (const workflow of [web, cli]) {
      expect(workflow).toContain("persist-credentials: false");
      expect(workflow).toContain("timeout-minutes: 20");
      expect(workflow).toContain("npm audit --audit-level=high");
    }
    expect(web).not.toContain("--audit-level=critical");
    expect(web).not.toContain("npm audit --omit=dev");
  });

  it("runs web CI when files covered by its repository assertions change", () => {
    const web = repositoryFile(".github/workflows/web-ci.yml");
    const triggerBlocks = [
      web.match(/  push:\r?\n[\s\S]*?(?=  pull_request:)/)?.[0],
      web.match(/  pull_request:\r?\n[\s\S]*?(?=\r?\npermissions:)/)?.[0],
    ];

    expect(triggerBlocks.every(Boolean)).toBe(true);
    for (const block of triggerBlocks) {
      expect(block).toContain('".claude/launch.json"');
      expect(block).toContain('".github/workflows/cli-ci.yml"');
    }
  });

  it("keeps repository launchers inside the PinHub workspace", () => {
    const launch = JSON.parse(repositoryFile(".claude/launch.json")) as {
      configurations: Array<{ name: string; runtimeArgs: string[] }>;
    };

    expect(launch.configurations.map((config) => config.name)).toEqual([
      "pinhub-prod",
      "pinhub-dev",
    ]);
    expect(JSON.stringify(launch)).not.toMatch(/[A-Za-z]:[\\/]/);
    expect(
      launch.configurations.flatMap((config) => config.runtimeArgs),
    ).not.toContain("--prefix");
  });
});
