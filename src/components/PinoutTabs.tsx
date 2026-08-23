"use client";

import { useId, useSyncExternalStore } from "react";
import { clsx } from "clsx";
import { CircuitBoard, Rows3 } from "lucide-react";
import type { Board } from "@/lib/boards";
import { PinoutDiagram } from "@/components/PinoutDiagram";
import { BoardPinoutVisualization } from "@/components/board-visual/BoardPinoutVisualization";

type PinoutTab = "static" | "dynamic";
const storageKey = "pinhub.pinoutTab";
const defaultTab: PinoutTab = "dynamic";
const tabOrder: readonly PinoutTab[] = ["static", "dynamic"];

// The chosen tab is persisted in localStorage and exposed to React through a
// tiny external store (same approach as favorites), which keeps SSR/hydration
// consistent — the server snapshot is always the default.
const listeners = new Set<() => void>();
let tabSnapshot: PinoutTab | null = null;

function onStorageEvent(event: StorageEvent) {
  if (event.key !== null && event.key !== storageKey) return;
  tabSnapshot = null;
  for (const listener of listeners) listener();
}

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
  if (listeners.size === 0) window.addEventListener("storage", onStorageEvent);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorageEvent);
  };
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
  const instanceId = useId();
  const tab = useSyncExternalStore(
    subscribeTab,
    getTabSnapshot,
    getServerTabSnapshot,
  );

  function selectTab(next: PinoutTab) {
    setTabPreference(next);
  }

  function handleTabListKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const currentIndex = tabOrder.indexOf(tab);
    let next: PinoutTab | undefined;

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowUp":
        next = tabOrder[(currentIndex - 1 + tabOrder.length) % tabOrder.length];
        break;
      case "ArrowRight":
      case "ArrowDown":
        next = tabOrder[(currentIndex + 1) % tabOrder.length];
        break;
      case "Home":
        next = tabOrder[0];
        break;
      case "End":
        next = tabOrder[tabOrder.length - 1];
        break;
      default:
        return;
    }

    if (!next) return;
    event.preventDefault();
    selectTab(next);
    event.currentTarget
      .querySelector<HTMLButtonElement>(`[data-pinout-tab="${next}"]`)
      ?.focus();
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-end gap-3">
        <div
          role="tablist"
          aria-label="Pin map view"
          onKeyDown={handleTabListKeyDown}
          className="inline-flex items-center border border-rule"
        >
          <TabButton
            id="static"
            tabId={`${instanceId}-pinout-tab-static`}
            panelId={`${instanceId}-pinout-panel-static`}
            label="Static"
            icon={<Rows3 className="size-3.5" aria-hidden="true" />}
            active={tab === "static"}
            onClick={() => selectTab("static")}
          />
          <TabButton
            id="dynamic"
            tabId={`${instanceId}-pinout-tab-dynamic`}
            panelId={`${instanceId}-pinout-panel-dynamic`}
            label="Dynamic"
            icon={<CircuitBoard className="size-3.5" aria-hidden="true" />}
            active={tab === "dynamic"}
            onClick={() => selectTab("dynamic")}
          />
        </div>
      </div>

      <div
        role="tabpanel"
        id={`${instanceId}-pinout-panel-static`}
        aria-labelledby={`${instanceId}-pinout-tab-static`}
        hidden={tab !== "static"}
      >
        {tab === "static" ? <PinoutDiagram pinout={board.pinout} /> : null}
      </div>
      <div
        role="tabpanel"
        id={`${instanceId}-pinout-panel-dynamic`}
        aria-labelledby={`${instanceId}-pinout-tab-dynamic`}
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
  tabId,
  panelId,
  label,
  icon,
  active,
  onClick,
}: {
  id: PinoutTab;
  tabId: string;
  panelId: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={tabId}
      data-pinout-tab={id}
      aria-selected={active}
      aria-controls={panelId}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={clsx(
        "silk inline-flex min-h-9 items-center gap-1.5 px-2.5 transition-colors",
        active ? "bg-raised !text-ink" : "hover:bg-raised hover:!text-ink",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
