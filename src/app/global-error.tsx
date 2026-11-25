"use client";

import { useEffect, useLayoutEffect } from "react";
import { applyStoredTheme } from "@/lib/theme";

// global-error replaces the root layout, so neither globals.css, the fonts,
// nor the layout's theme script reach it. It carries its own small sheet,
// keyed on the same `data-theme` attribute and the same colour tokens.
const globalErrorStyles = `
:root {
  color-scheme: dark;
  --ge-bg: #080a0e;
  --ge-panel: #10131a;
  --ge-border: rgba(255, 255, 255, 0.1);
  --ge-text: #f4f4f5;
  --ge-muted: #a1a1aa;
  --ge-eyebrow: #fca5a5;
  --ge-action-text: #ecfeff;
  --ge-action-bg: rgba(103, 232, 249, 0.1);
  --ge-action-bg-hover: rgba(103, 232, 249, 0.18);
  --ge-action-border: rgba(103, 232, 249, 0.3);
  --ge-focus: #67e8f9;
}
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    color-scheme: light;
    --ge-bg: #edf2f4;
    --ge-panel: #ffffff;
    --ge-border: rgba(31, 48, 58, 0.16);
    --ge-text: #17202a;
    --ge-muted: #44545d;
    --ge-eyebrow: #b91c1c;
    --ge-action-text: #075b6b;
    --ge-action-bg: rgba(8, 145, 178, 0.14);
    --ge-action-bg-hover: rgba(8, 145, 178, 0.2);
    --ge-action-border: rgba(8, 145, 178, 0.35);
    --ge-focus: #0e7490;
  }
}
:root[data-theme="light"] {
  color-scheme: light;
  --ge-bg: #edf2f4;
  --ge-panel: #ffffff;
  --ge-border: rgba(31, 48, 58, 0.16);
  --ge-text: #17202a;
  --ge-muted: #44545d;
  --ge-eyebrow: #b91c1c;
  --ge-action-text: #075b6b;
  --ge-action-bg: rgba(8, 145, 178, 0.14);
  --ge-action-bg-hover: rgba(8, 145, 178, 0.2);
  --ge-action-border: rgba(8, 145, 178, 0.35);
  --ge-focus: #0e7490;
}
*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  background: var(--ge-bg);
  color: var(--ge-text);
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  -webkit-text-size-adjust: 100%;
}
.ge-main {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px 16px;
}
.ge-card {
  width: 100%;
  max-width: 28rem;
  padding: 24px;
  border: 1px solid var(--ge-border);
  border-radius: 12px;
  background: var(--ge-panel);
  text-align: center;
}
.ge-eyebrow {
  margin: 0;
  color: var(--ge-eyebrow);
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
.ge-title { margin: 8px 0 0; font-size: 24px; font-weight: 600; line-height: 1.25; }
.ge-copy { margin: 12px 0 0; color: var(--ge-muted); font-size: 14px; line-height: 24px; }
.ge-action {
  min-height: 44px;
  margin-top: 20px;
  padding: 0 16px;
  border: 1px solid var(--ge-action-border);
  border-radius: 8px;
  background: var(--ge-action-bg);
  color: var(--ge-action-text);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.ge-action:focus-visible { outline: 2px solid var(--ge-focus); outline-offset: 2px; }
@media (hover: hover) { .ge-action:hover { background: var(--ge-action-bg-hover); } }
`;

// useLayoutEffect applies the stored theme before paint in the browser; the
// server prerender of this page has no storage to read, so it is skipped there.
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  /** Re-fetches and re-renders the root; `reset` would only re-render it. */
  retry: () => void;
}) {
  useBrowserLayoutEffect(() => {
    applyStoredTheme();
  }, []);

  useEffect(() => {
    console.error("PinHub root error", error.digest ?? error.name);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>PinHub could not start</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{globalErrorStyles}</style>
      </head>
      <body>
        <main className="ge-main">
          <section className="ge-card" aria-labelledby="global-error-title">
            <p className="ge-eyebrow">Unexpected error</p>
            <h1 id="global-error-title" className="ge-title">PinHub could not start</h1>
            <p className="ge-copy">
              Try again. If this persists, check the latest deployment status.
            </p>
            <button type="button" onClick={() => retry()} className="ge-action">
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
