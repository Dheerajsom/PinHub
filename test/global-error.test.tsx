// @vitest-environment jsdom

import { cleanup, fireEvent, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import GlobalError from "@/app/global-error";

const error = Object.assign(new Error("boom"), { digest: "abc123" });

describe("global error boundary", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    vi.restoreAllMocks();
  });

  // Mounted first: React wires its event listeners on `document` once.
  it("retries with retry(), which re-fetches, and logs only the digest", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    const reset = vi.fn();
    const view = render(<GlobalError error={error} retry={retry} {...({ reset } as object)} />, { container: document });
    fireEvent.click(view.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(reset).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("PinHub root error", "abc123");
  });

  it("applies the stored light theme, since the layout's theme script does not run", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem("pinhub.theme", "light");
    render(<GlobalError error={error} retry={() => {}} />, { container: document });
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("ships its own styles for both themes", () => {
    // global-error replaces the root layout, so globals.css never loads; it
    // used to render bare Tailwind class names on an unstyled page.
    const markup = renderToStaticMarkup(<GlobalError error={error} retry={() => {}} />);
    const style = /<style>([\s\S]*?)<\/style>/.exec(markup)?.[1] ?? "";
    expect(style).toContain(':root[data-theme="light"]');
    expect(style).toContain("prefers-color-scheme: light");
    expect(style).toMatch(/\.ge-action\s*\{[^}]*min-height:\s*44px/);
    expect(markup).not.toMatch(/class="[^"]*\b(?:bg|text|border)-/);
  });
});
