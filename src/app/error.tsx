"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep the digest for platform correlation without logging user data.
    console.error("PinHub route error", error.digest ?? error.name);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#080a0e] px-6 text-zinc-100">
      <section className="max-w-md rounded-xl border border-red-300/20 bg-[#10131a] p-6 text-center shadow-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-red-300">Unexpected error</p>
        <h1 className="mt-2 text-2xl font-semibold">The catalog could not be displayed</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Try the request again. If it keeps failing, the deployment may need attention.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 min-h-11 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 text-sm font-medium text-cyan-50 hover:bg-cyan-300/15"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
