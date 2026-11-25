"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

/**
 * "Show more" for the finder's fits: a URL step, so the server renders one
 * more page instead of every fit up front. It stays mounted when the last
 * page arrives (rendering nothing), so it can hand focus to the first newly
 * shown board rather than letting it fall to the page.
 */
export function FindMoreLink({ href, visible, label }: { href: string; visible: number; label: string | null }) {
  const requestedFrom = useRef<number | null>(null);

  useEffect(() => {
    const from = requestedFrom.current;
    if (from === null || visible <= from) return;
    requestedFrom.current = null;
    document.querySelector<HTMLElement>(`[data-fit-index="${from}"] a`)?.focus();
  }, [visible]);

  if (!label) return null;
  return (
    <p className="mt-3">
      <Link
        href={href}
        replace
        scroll={false}
        onClick={() => {
          requestedFrom.current = visible;
        }}
        className="ph-find-summary inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-cyan-200"
      >
        {label}
      </Link>
    </p>
  );
}
