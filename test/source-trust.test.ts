import { describe, expect, it } from "vitest";
import { classifySource, isSafeExternalUrl } from "@/lib/source-trust";

describe("external source trust", () => {
  it.each(["constructor", "__proto__", "toString"])("treats unknown vendor %s as third-party", (vendor) => {
    expect(classifySource(vendor, "https://www.arduino.cc/docs")).toBe("third-party");
    expect(classifySource(vendor, "https://github.com/arduino/Arduino")).toBe("third-party");
  });

  it("accepts credential-free public HTTPS URLs", () => {
    expect(isSafeExternalUrl("https://docs.arduino.cc/hardware/uno-rev3/"))
      .toBe(true);
  });

  it.each([
    "http://example.com/docs",
    "https://user:secret@example.com/docs",
    "https://example.com:8443/docs",
    "https://localhost/docs",
    "https://127.0.0.1/docs",
    "https://[::1]/docs",
    "/relative/docs",
  ])("rejects non-public or ambiguous source URL %s", (url) => {
    expect(isSafeExternalUrl(url)).toBe(false);
  });

  it("does not treat user-published Google surfaces as official Coral docs", () => {
    expect(
      classifySource(
        "Google Coral",
        "https://sites.google.com/view/community-coral-pinout",
      ),
    ).toBe("third-party");
    expect(
      classifySource("Google Coral", "https://coral.ai/docs/dev-board/"),
    ).toBe("official");
  });

  it("matches real vendor subdomains without accepting lookalike hosts", () => {
    expect(
      classifySource("Arduino", "https://docs.arduino.cc/hardware/uno-rev3/"),
    ).toBe("official");
    expect(
      classifySource("Arduino", "https://docs.arduino.cc.example.com/uno"),
    ).toBe("third-party");
  });
});
