"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, X } from "lucide-react";
import type { Board, PinRole } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { InspectorBody } from "@/components/board-visual/InspectorBody";
import { VendorLogo } from "@/components/VendorLogo";
import { CircuitBackground } from "@/components/CircuitBackground";
import { ThemeToggle } from "@/components/ThemeToggle";

// Standalone, full-viewport pinout sheet served at /pinout/[id]. Built for the
// dense expansion headers whose drawings are cramped inside the catalog's narrow
// detail column, but works for every board with a pin map.
export function PinoutFullView({ board }: { board: Board }) {
  const geometry = useMemo(() => buildBoardGeometry(board), [board]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<PinRole | null>(null);
  const [query, setQuery] = useState("");

  const anchorsByKey = useMemo(() => {
    const map = new Map<string, NonNullable<typeof geometry>["anchors"][number]>();
    geometry?.anchors.forEach((a) => map.set(a.key, a));
    return map;
  }, [geometry]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return (geometry?.anchors ?? []).filter(({ pin }) =>
      [
        pin.label,
        pin.role,
        pin.note ?? "",
        ...(pin.aliases ?? []),
      ].some((value) => value.toLowerCase().includes(needle)),
    );
  }, [geometry, query]);

  const liveAnchor = anchorsByKey.get(activeKey ?? selectedKey ?? "") ?? null;

  return (
    <main
      className="relative isolate min-h-screen px-4 py-5 sm:px-6 lg:px-8"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        if (selectedKey) {
          setSelectedKey(null);
          setActiveKey(null);
        } else {
          setActiveRole(null);
        }
      }}
    >
      <CircuitBackground />
      <div className="relative mx-auto max-w-[1400px]">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-white/10 pb-4">
          <div className="min-w-0">
            <Link
              href={`/boards/${board.id}`}
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-zinc-500 transition hover:text-cyan-200"
            >
              <ArrowLeft className="size-3" aria-hidden="true" />
              Board overview
            </Link>
            <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-white">
              <VendorLogo vendor={board.vendor} size={24} />
              {board.name}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
              {[board.vendor, board.family]
                .filter((part, index, all) => all.indexOf(part) === index)
                .join(" · ")}
            </p>
            <ThemeToggle />
          </div>
        </header>

        {geometry ? (
          <div className="mt-5">
            <label className="relative mb-4 block">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Find a pin, alias, role, or warning…"
                aria-label="Search pins"
                className="h-11 w-full rounded-md border border-white/10 bg-[#0a0c11] pl-10 pr-12 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-300/70 focus:ring-1 focus:ring-cyan-300/30"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear pin search"
                  className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center text-zinc-500 transition hover:text-white"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </label>
            {query ? (
              <div
                className="mb-4 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto"
                role="status"
              >
                {matches.length ? (
                  matches.map((anchor) => (
                    <button
                      key={anchor.key}
                      type="button"
                      onClick={() => {
                        setSelectedKey(anchor.key);
                        setActiveKey(anchor.key);
                      }}
                      className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 font-mono text-xs text-zinc-200 transition hover:border-cyan-300/60 hover:text-white"
                    >
                      {anchor.pin.position} · {anchor.pin.label}
                    </button>
                  ))
                ) : (
                  <span className="px-1 py-1 text-xs text-zinc-500">
                    No pin matches that.
                  </span>
                )}
              </div>
            ) : null}
            {/* Opaque panel: the workbench backdrop belongs in the page
                gutters, not behind a diagram that has to be read. */}
            <div className="surface-panel rounded-lg p-4">
              <InspectorBody
                board={board}
                geometry={geometry}
                selectedKey={selectedKey}
                activeKey={activeKey ?? selectedKey}
                activeRole={activeRole}
                liveAnchor={liveAnchor}
                onSelect={(key) => {
                  setSelectedKey(key);
                  setActiveKey(key);
                }}
                onActiveKey={setActiveKey}
                onToggleRole={setActiveRole}
              />
            </div>
          </div>
        ) : (
          <p className="mt-8 rounded-lg border border-dashed border-white/15 bg-[#101319] p-6 text-sm text-zinc-400">
            This board has no in-app connector map yet. See the catalog entry for
            its official documentation links.
          </p>
        )}
      </div>
    </main>
  );
}
