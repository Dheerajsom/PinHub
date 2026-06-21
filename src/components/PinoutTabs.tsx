"use client";

import { useSyncExternalStore } from "react";
import { clsx } from "clsx";
import { CircuitBoard, Rows3 } from "lucide-react";
import type { Board } from "@/lib/boards";
import { PinoutDiagram } from "@/components/PinoutDiagram";
import { BoardPinoutVisualization } from "@/components/board-visual/BoardPinoutVisualization";

type PinoutTab = "static" | "dynamic";
const storageKey = "pinhub.pinoutTab";
const defaultTab: PinoutTab = "dynamic";

// The chosen tab is persisted in localStorage and exposed to React through a
// tiny external store (same approach as favorites), which keeps SSR/hydration
// consistent — the server snapshot is always the default.
const listeners = new Set<() => void>();
let tabSnapshot: PinoutTab | null = null;

function getTabSnapshot(): PinoutTab {
  if (tabSnapshot === null) {
    try {
      const saved = window.localStorage.getItem(storageKey);
      tabSnapshot = saved === "static" || saved === "dynamic" ? saved : defaultTab;
    } catch {
      tabSnapshot = defaultTab;
    }
  }
  return tabSnapshot;
}

function getServerTabSnapshot(): PinoutTab {
  return defaultTab;
}

function subscribeTab(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setTabPreference(next: PinoutTab) {
  tabSnapshot = next;
  try {
    window.localStorage.setItem(storageKey, next);
  } catch {
    // best-effort
  }
  for (const listener of listeners) listener();
}

// Wraps the two pinout presentations behind a small segmented control. "Static"
// is the dense, scannable list map; "Dynamic" is the interactive board diagram.
export function PinoutTabs({ board }: { board: Board }) {
  const tab = useSyncExternalStore(
    subscribeTab,
    getTabSnapshot,
    getServerTabSnapshot,
  );
  const choose = setTabPreference;

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          Pin map
        </div>
        <div
          role="tablist"
          aria-label="Pin map view"
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#0a0c11] p-1"
        >
          <TabButton
            id="static"
            label="Static"
            icon={<Rows3 className="size-3.5" aria-hidden="true" />}
            active={tab === "static"}
            onClick={() => choose("static")}
          />
          <TabButton
            id="dynamic"
            label="Dynamic"
            icon={<CircuitBoard className="size-3.5" aria-hidden="true" />}
            active={tab === "dynamic"}
            onClick={() => choose("dynamic")}
          />
        </div>
      </div>

      <div
        role="tabpanel"
        id="pinout-panel-static"
        aria-labelledby="pinout-tab-static"
        hidden={tab !== "static"}
      >
        {tab === "static" ? <PinoutDiagram pinout={board.pinout} /> : null}
      </div>
      <div
        role="tabpanel"
        id="pinout-panel-dynamic"
        aria-labelledby="pinout-tab-dynamic"
        hidden={tab !== "dynamic"}
      >
        {tab === "dynamic" ? (
          <BoardPinoutVisualization key={board.id} board={board} />
        ) : null}
      </div>
    </section>
  );
}

function TabButton({
  id,
  label,
  icon,
  active,
  onClick,
}: {
  id: PinoutTab;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`pinout-tab-${id}`}
      aria-selected={active}
      aria-controls={`pinout-panel-${id}`}
      onClick={onClick}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition",
        active
          ? "bg-cyan-300/15 text-cyan-50 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.4)]"
          : "text-zinc-400 hover:bg-white/[0.06] hover:text-white",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
