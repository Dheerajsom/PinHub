"use client";

import { useMemo, useRef, useState } from "react";
import { Expand, ExternalLink, RotateCcw, Search, ZoomIn, ZoomOut } from "lucide-react";
import type { Board, PinRole } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { raspberryPiModel } from "@/lib/raspberry-pi-models";
import { BoardStage } from "@/components/board-visual/BoardStage";
import { ExpandedInspector } from "@/components/board-visual/BoardPinoutVisualization";
import { PinRoleLegend } from "@/components/board-visual/PinRoleLegend";
import { PinDetails } from "@/components/board-visual/PinDetails";
import { countRoles, roleLabels, roleColors } from "@/components/board-visual/roles";
import { probedNet, useBoardNets } from "@/components/board-visual/use-board-nets";
import { classifySource } from "@/lib/source-trust";

/** The same source pin objects drive the board, selector, readout and schedule. */
export function RaspberryPiPinout({ board }: { board: Board }) {
  const geometry = useMemo(() => buildBoardGeometry(board), [board]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<PinRole | null>(null);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const expandRef = useRef<HTMLButtonElement>(null);
  const nets = useBoardNets(geometry?.anchors);
  const liveKey = hoverKey ?? selectedKey;
  const probe = probedNet(nets, liveKey);
  const anchors = useMemo(() => [...(geometry?.anchors ?? [])].sort((a, b) => a.pin.position - b.pin.position), [geometry]);
  const roleCounts = useMemo(() => countRoles(anchors.map(({ pin }) => pin)), [anchors]);
  const source = board.sourceLinks.find((link) => link.type === "Pinout") ?? board.sourceLinks[0];
  const sourceInfo = source ? { ...source, provenance: classifySource(board.vendor, source.url) } : undefined;
  if (!geometry || !board.pinout) return null;
  const model = raspberryPiModel(board.id)!;
  const liveAnchor = anchors.find((anchor) => anchor.key === liveKey) ?? null;
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const visible = anchors.filter(({ pin }) =>
    (!activeRole || pin.role === activeRole) && terms.every((term) =>
      `${pin.position} ${pin.label} ${(pin.aliases ?? []).join(" ")} ${pin.note ?? ""}`.toLowerCase().includes(term)),
  );
  const select = (key: string | null) => { setSelectedKey(key); setHoverKey(null); };

  return (
    <section className="pi-workbench" aria-label={`${board.name} dynamic pinout`} onKeyDown={(event) => {
      if (event.key === "Escape" && !expanded) { select(null); setActiveRole(null); }
    }}>
      <header className="pi-workbench-heading">
        <div>
          <h3>{board.name}</h3>
          <p>Component view / {board.pinout.connector}</p>
        </div>
        <div className="pi-tools">
          <button ref={expandRef} type="button" onClick={() => setExpanded(true)}><Expand size={14} aria-hidden="true" /> Inspect</button>
          <a href={`/pinout/${board.id}`} aria-label={`Open the ${board.name} full pinout`}><ExternalLink size={14} aria-hidden="true" /><span>Full view</span></a>
        </div>
      </header>

      <div className="pi-role-bar"><PinRoleLegend counts={roleCounts} activeRole={activeRole} onToggle={setActiveRole} />
        {activeRole ? <button className="pi-clear" type="button" onClick={() => setActiveRole(null)}>Show all roles</button> : null}
      </div>

      <div className="pi-component-layout">
        <div className={`pi-canvas ${model.family === "pico" ? "pi-canvas-pico" : ""}`}>
          <div className="pi-canvas-scroll" tabIndex={zoomed ? 0 : undefined} aria-label={zoomed ? "Scrollable board detail" : undefined}>
            <div className={zoomed ? "pi-board-frame is-zoomed" : "pi-board-frame"} style={{ aspectRatio: `${geometry.body.w + 48} / ${geometry.body.h + 55}` }}>
              <BoardStage geometry={geometry} title={`${board.name} — ${board.pinout.connector}`} sheetLabel={board.name}
                compact selectedKey={selectedKey} activeKey={liveKey} activeRole={activeRole} showAllLabels={false} netKeys={probe.keys} onSelect={select} onActiveKey={setHoverKey} />
            </div>
          </div>
          <div className="pi-canvas-footer">
            <span>{model.family === "keyboard" ? "Connector schematic" : "Component side"}</span>
            <button type="button" onClick={() => setZoomed(!zoomed)}>{zoomed ? <ZoomOut size={14} aria-hidden="true" /> : <ZoomIn size={14} aria-hidden="true" />}{zoomed ? "Fit board" : "Zoom board"}</button>
          </div>
        </div>

        <aside className="pi-readout">
          <label className="pi-pin-picker">Select a pin
            <select aria-label="Select physical pin" value={selectedKey ?? ""} onChange={(event) => select(event.target.value || null)}>
              <option value="">Choose pin…</option>
              {anchors.map(({ key, pin }) => <option key={key} value={key}>{pin.position} · {pin.label}{pin.aliases?.length ? ` / ${pin.aliases.join(", ")}` : ""}</option>)}
            </select>
          </label>
          <div className="pi-live-heading" aria-hidden="true">
            <span>Physical pin</span><strong>{liveAnchor ? String(liveAnchor.pin.position).padStart(2, "0") : "—"}</strong>
          </div>
          <PinDetails anchor={liveAnchor} pinned={selectedKey !== null} net={probe.net} netSize={probe.keys.size} />
          {selectedKey ? <button className="pi-clear" type="button" onClick={() => select(null)}><RotateCcw size={13} aria-hidden="true" /> Clear selection</button> : null}

          <div className="pi-electrical-note"><strong>{board.logicLevel}</strong><p>{model.family === "pico" ? "Check power and ADC limits in the notes below." : "GPIO is not 5 V tolerant. Power rails are separate from signal pins."}</p></div>
          {sourceInfo ? <a className="pi-source" href={sourceInfo.url} target="_blank" rel="noopener noreferrer">Verify in {sourceInfo.provenance === "official" ? "official" : "linked"} documentation <ExternalLink size={12} aria-hidden="true" /></a> : null}
        </aside>
      </div>

      <p className="pi-illustration-note">{geometry.revisionNote} Decorative traces do not represent electrical connections.</p>

      <details className="pi-schedule">
        <summary>{`All ${anchors.length} pins (table)`}</summary>
        <div className="pi-schedule-tools">
          <label><Search size={16} aria-hidden="true" /><input aria-label="Search reference pins" value={query} maxLength={100} onChange={(event) => setQuery(event.target.value)} placeholder="Pin number, signal, or function" /></label>
          <span role="status">{visible.length} / {anchors.length} pins</span>
        </div>
        <div className="pi-schedule-scroll">
          <table>
            <caption className="sr-only">{board.name} physical pin schedule</caption>
            <thead><tr><th scope="col">Pin</th><th scope="col">Signal</th><th scope="col">Function / note</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>{visible.map(({ key, pin }) => <tr key={key} data-selected={selectedKey === key || undefined}>
              <th scope="row"><span className="pi-pin-number" style={{ borderColor: roleColors[pin.role].edge }}>{pin.position}</span></th>
              <td><strong>{pin.label}</strong><small>{roleLabels[pin.role]}</small></td>
              <td>{pin.aliases?.length ? <span>{pin.aliases.join(" / ")}</span> : <span className="pi-muted">{roleLabels[pin.role]}</span>}{pin.note ? <p>{pin.note}</p> : null}</td>
              <td><button className="pi-row-select" type="button" aria-label={`Select pin ${pin.position}, ${pin.label}`} aria-pressed={selectedKey === key} onClick={() => select(selectedKey === key ? null : key)}>Select</button></td>
            </tr>)}</tbody>
          </table>
        </div>
        {!visible.length ? <p className="pi-empty">No matching pins. <button type="button" onClick={() => { setQuery(""); setActiveRole(null); }}>Clear filters</button></p> : null}
      </details>
      <ul className="pi-wiring-notes">{board.pinout.notes.map((note) => <li key={note}>{note}</li>)}</ul>

      {expanded ? <ExpandedInspector board={board} geometry={geometry} selectedKey={selectedKey} activeKey={liveKey} activeRole={activeRole} liveAnchor={liveAnchor} onSelect={select} onActiveKey={setHoverKey} onToggleRole={setActiveRole} onClose={() => { setExpanded(false); requestAnimationFrame(() => expandRef.current?.focus()); }} /> : null}
    </section>
  );
}
