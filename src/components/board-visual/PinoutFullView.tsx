"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Search, TriangleAlert, X } from "lucide-react";
import type { Board, PinRole } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { getBoardDiscoveryProfile } from "@/lib/board-discovery";
import { InspectorBody } from "@/components/board-visual/InspectorBody";
import { HazardBlock, VerifyStrip } from "@/components/board/BoardBlocks";

/**
 * The reference sheet, at `/pinout/[id]`.
 *
 * This is the page you keep open with a board in your hand, and the one the
 * print stylesheet is built around. So it leads with the two electrical facts
 * that decide whether wiring is safe — logic level and 5 V tolerance — and
 * carries the full wiring cautions. Someone landing here cold from a search
 * engine must not have to visit another page to learn a board is not 5 V
 * tolerant.
 */
export function PinoutFullView({ board }: { board: Board }) {
  const geometry = useMemo(() => buildBoardGeometry(board), [board]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<PinRole | null>(null);
  const [query, setQuery] = useState("");
  const profile = getBoardDiscoveryProfile(board);

  const anchorsByKey = useMemo(() => {
    const map = new Map<string, NonNullable<typeof geometry>["anchors"][number]>();
    geometry?.anchors.forEach((anchor) => map.set(anchor.key, anchor));
    return map;
  }, [geometry]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return (geometry?.anchors ?? []).filter(({ pin }) =>
      [
        String(pin.position),
        pin.label,
        pin.role,
        pin.note ?? "",
        ...(pin.aliases ?? []),
      ].some((value) => value.toLowerCase().includes(needle)),
    );
  }, [geometry, query]);

  const liveAnchor = anchorsByKey.get(activeKey ?? selectedKey ?? "") ?? null;
  const fiveVolt = profile.fiveVoltTolerance;
  const fiveVoltRisky = fiveVolt === "No" || fiveVolt === "Mixed";

  return (
    <main
      className="panel-grain min-h-screen px-4 py-3 sm:px-6"
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
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-rule pb-2">
          <div className="min-w-0">
            <Link
              href={`/boards/${board.id}`}
              className="silk inline-flex items-center gap-1 transition-colors hover:!text-ink"
              data-print="hide"
            >
              <ArrowLeft className="size-2.5" aria-hidden="true" />
              {board.name} overview
            </Link>
            <h1 className="readout mt-1 text-2xl uppercase text-ink">
              {board.name} pinout
            </h1>
            <p className="data mt-0.5 text-[11px] text-faint">
              {board.vendor} · {board.pinout?.connector ?? "No mapped connector"}
              {geometry ? ` · ${geometry.anchors.length} pins` : ""}
            </p>
          </div>

          {/* The two facts that decide whether a wire is safe, printed on the
              sheet itself rather than one page away. */}
          <dl className="flex flex-wrap items-end gap-x-5 gap-y-2">
            <div>
              <dt className="silk">Logic level</dt>
              <dd className="data mt-0.5 text-[13px] text-ink">
                {board.logicLevel}
              </dd>
            </div>
            <div>
              <dt className="silk">5 V tolerance</dt>
              <dd
                className={
                  fiveVoltRisky
                    ? "data mt-0.5 text-[13px] font-semibold text-hazard-ink"
                    : "data mt-0.5 text-[13px] text-ink"
                }
              >
                {fiveVolt === "Unknown" ? "Not documented" : fiveVolt}
              </dd>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="ctl !min-h-8"
              data-print="hide"
            >
              <Printer className="size-3.5" aria-hidden="true" />
              Print sheet
            </button>
          </dl>
        </header>

        <div className="mb-2 grid gap-2">
          <HazardBlock board={board} />
          <VerifyStrip board={board} />
        </div>

        {geometry ? (
          <>
            <div className="mb-2" data-print="hide">
              <label className="relative block">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint"
                  aria-hidden="true"
                />
                <span className="sr-only">Search pins on this connector</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setQuery("");
                  }}
                  placeholder="Find a pin by number, signal, alias, role, or note"
                  className="h-10 w-full border border-rule bg-well pl-8 pr-10 text-[13px] text-ink outline-none placeholder:text-faint focus-visible:border-ink"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear pin search"
                    className="absolute right-0 top-1/2 grid size-10 -translate-y-1/2 place-items-center text-faint transition-colors hover:text-ink"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </label>

              {query ? (
                <div
                  className="mt-1.5 flex max-h-24 flex-wrap gap-1 overflow-y-auto"
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
                        className="chip transition-colors hover:text-ink"
                      >
                        {anchor.pin.position} · {anchor.pin.label}
                      </button>
                    ))
                  ) : (
                    <span className="text-[13px] text-dim">
                      No pin on this connector matches that. Try a pin number, a
                      signal name, or an alias such as SDA.
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            <div className="panel p-3" data-print="expand">
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
          </>
        ) : (
          <section className="panel p-5">
            <h2 className="silk flex items-center gap-1.5">
              <TriangleAlert className="size-3" aria-hidden="true" />
              No connector map
            </h2>
            <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-dim">
              PinHub has not mapped this connector yet. Pin data is only
              published once it can be checked against a vendor document, so
              nothing is drawn rather than guessed.
            </p>
            <Link href={`/boards/${board.id}`} className="ctl mt-3">
              See the documented sources for {board.name}
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
