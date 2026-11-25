// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorBoundary from "@/app/error";
import { resolveTheme } from "@/lib/theme";

// global-error renders its own <html>, so its tests live in global-error.test.tsx:
// React only wires events on `document` for the first root mounted there.

const error = Object.assign(new Error("boom"), { digest: "abc123" });

describe("route error boundary", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("retries the segment with retry(), which re-fetches, instead of reset()", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    const reset = vi.fn();
    // `reset` is passed too, as Next does; the boundary must not use it.
    render(<ErrorBoundary error={error} retry={retry} {...({ reset } as object)} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(reset).not.toHaveBeenCalled();
  });
});

describe("resolveTheme", () => {
  it("prefers a valid stored choice, then the OS preference", () => {
    expect(resolveTheme(() => "light", () => false)).toBe("light");
    expect(resolveTheme(() => "dark", () => true)).toBe("dark");
    expect(resolveTheme(() => "neon", () => true)).toBe("light");
    expect(resolveTheme(() => null, () => false)).toBe("dark");
  });

  it("falls back when storage or matchMedia throws", () => {
    const throws = () => {
      throw new Error("blocked");
    };
    expect(resolveTheme(throws, () => true)).toBe("light");
    expect(resolveTheme(throws, throws)).toBe("dark");
  });
});
