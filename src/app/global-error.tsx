"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("PinHub root error", error.digest ?? error.name);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#080a0e] text-zinc-100">
        <main className="grid min-h-screen place-items-center px-6">
          <section className="max-w-md text-center">
            <h1 className="text-2xl font-semibold">PinHub could not start</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Reload the application. If this persists, check the latest deployment status.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-5 min-h-11 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 text-sm font-medium text-cyan-50"
            >
              Reload PinHub
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
