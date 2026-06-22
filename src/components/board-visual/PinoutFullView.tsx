"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CircuitBoard } from "lucide-react";
import type { Board, PinRole } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { InspectorBody } from "@/components/board-visual/InspectorBody";
import { VendorLogo } from "@/components/VendorLogo";

// Standalone, full-viewport pinout inspector served at /pinout/[id]. Built for
// the dense FPGA expansion-header boards whose diagrams are cramped inside the
// catalog's narrow detail column, but works for every board with a pin map.
export function PinoutFullView({ board }: { board: Board }) {
  const geometry = useMemo(() => buildBoardGeometry(board), [board]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<PinRole | null>(null);

  const anchorsByKey = useMemo(() => {
    const map = new Map<string, NonNullable<typeof geometry>["anchors"][number]>();
    geometry?.anchors.forEach((a) => map.set(a.key, a));
    return map;
  }, [geometry]);

  const presentRoles = useMemo(() => {
    const set = new Set<PinRole>();
    geometry?.anchors.forEach((a) => set.add(a.pin.role));
    return set;
  }, [geometry]);

  const liveAnchor = anchorsByKey.get(activeKey ?? selectedKey ?? "") ?? null;

  return (
    <main
      className="min-h-screen bg-[#070a0d] px-4 py-5 sm:px-6 lg:px-8"
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
      <div className="mx-auto max-w-[1400px]">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition hover:text-cyan-200"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Back to catalog
            </Link>
            <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-semibold text-white">
              <VendorLogo vendor={board.vendor} size={24} />
              {board.name}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {board.vendor} · {board.family}
              {board.pinout ? ` · ${board.pinout.connector}` : ""}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-300/40 bg-cyan-300/10 px-2.5 py-1.5 text-xs font-medium text-cyan-50">
            <CircuitBoard className="size-3.5" aria-hidden="true" />
            Full pinout view
          </span>
        </header>

        {geometry ? (
          <div className="mt-5">
            <InspectorBody
              board={board}
              geometry={geometry}
              selectedKey={selectedKey}
              activeKey={activeKey ?? selectedKey}
              activeRole={activeRole}
              liveAnchor={liveAnchor}
              presentRoles={presentRoles}
              onSelect={(key) => {
                setSelectedKey(key);
                setActiveKey(key);
              }}
              onActiveKey={setActiveKey}
              onToggleRole={setActiveRole}
            />
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
