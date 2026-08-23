"use client";

import Link from "next/link";
import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

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
    <div className="panel-grain grid min-h-screen place-items-center px-4">
      <section className="panel max-w-lg p-5">
        <h1 className="silk flex items-center gap-1.5 !text-hazard-ink">
          <TriangleAlert className="size-3" aria-hidden="true" />
          Catalog failed to render
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-dim">
          The page stopped part-way through building. Nothing was changed and no
          board data was lost — this is a rendering fault, not a data one.
          Retrying usually clears it.
        </p>
        {error.digest ? (
          <p className="data mt-2 text-[11px] text-faint">
            Reference {error.digest}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-1.5">
          <button type="button" onClick={reset} className="ctl">
            Try again
          </button>
          <Link href="/" className="ctl">
            Back to the index
          </Link>
        </div>
      </section>
    </div>
  );
}
