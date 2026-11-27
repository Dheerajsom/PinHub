"use client";

import { useId } from "react";
import { clsx } from "clsx";
import { CircuitBoard, Rows3 } from "lucide-react";
import type { Board } from "@/lib/boards";
import { PinoutDiagram } from "@/components/PinoutDiagram";
import { BoardPinoutVisualization } from "@/components/board-visual/BoardPinoutVisualization";
import { RaspberryPiPinout } from "@/components/board-visual/RaspberryPiPinout";
import { raspberryPiModel } from "@/lib/raspberry-pi-models";
import { PrintPinReference } from "@/components/board-visual/PrintPinReference";
import { pinoutTabOrder as tabOrder, setPinoutTab, usePinoutTab, type PinoutTab } from "@/lib/pinout-tab";

// Wraps the two pinout presentations behind a small segmented control. "Static"
// is the dense, scannable list map; "Dynamic" is the interactive board diagram.
export function PinoutTabs({ board }: { board: Board }) {
  const isRaspberryPi = Boolean(raspberryPiModel(board.id));
  const instanceId = useId();
  const tab = usePinoutTab();

  function selectTab(next: PinoutTab) {
    setPinoutTab(next);
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

  if (!board.pinout) return <PinoutDiagram board={board} />;

  return (
    <section>
      <PrintPinReference board={board} />
      <div className="pin-screen-reference">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          Pin map
        </div>
        <div
          role="tablist"
          aria-label="Pin map view"
          onKeyDown={handleTabListKeyDown}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#0a0c11] p-1"
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
        {tab === "static" ? <PinoutDiagram pinout={board.pinout} board={board} /> : null}
      </div>
      <div
        role="tabpanel"
        id={`${instanceId}-pinout-panel-dynamic`}
        aria-labelledby={`${instanceId}-pinout-tab-dynamic`}
        hidden={tab !== "dynamic"}
      >
        {tab === "dynamic" ? (
          isRaspberryPi ? <RaspberryPiPinout key={`${board.id}-dynamic`} board={board} /> : <BoardPinoutVisualization key={board.id} board={board} />
        ) : null}
      </div>
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
        "inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition",
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
