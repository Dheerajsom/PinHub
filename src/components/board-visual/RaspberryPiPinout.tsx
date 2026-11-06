"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Expand, ExternalLink, Search, ShieldAlert, ZoomIn, ZoomOut } from "lucide-react";
import type { Board, Pin, PinRole } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import { raspberryPiModel } from "@/lib/raspberry-pi-models";
import { BoardStage } from "@/components/board-visual/BoardStage";
import { touchDrawingWidth } from "@/components/board-visual/touch-sizing";
import { connectorCells, connectorKeyTarget } from "@/components/board-visual/connector-cells";
import { ExpandedInspector } from "@/components/board-visual/BoardPinoutVisualization";
import { PinRoleLegend } from "@/components/board-visual/PinRoleLegend";
import { PinDetails } from "@/components/board-visual/PinDetails";
import { PinCautions } from "@/components/board-visual/PinCautions";
import { countRoles, pinAccessibleLabel, roleLabels, roleColors } from "@/components/board-visual/roles";
import { probedNet, useBoardNets } from "@/components/board-visual/use-board-nets";
import { classifySource, verificationSourceFor } from "@/lib/source-trust";
import { pinReportContextFor } from "@/lib/pin-report";
import { fiveVoltCaution } from "@/lib/board-utilities";

/** The same source pin objects drive the board, selector, readout and schedule. */
export function RaspberryPiPinout({ board }: { board: Board }) {
  const geometry = useMemo(() => buildBoardGeometry(board), [board]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<PinRole | null>(null);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  // Fit is the default: the whole physical board is visible in a 334 px panel.
  // Touch size enlarges it so every pad's hit area is at least 44 px.
  const [zoomed, setZoomed] = useState(false);
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const connectorRef = useRef<HTMLDivElement>(null);
  const pinRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const nets = useBoardNets(geometry?.anchors);
  const liveKey = hoverKey ?? selectedKey;
  const probe = probedNet(nets, liveKey);
  const anchors = useMemo(() => [...(geometry?.anchors ?? [])].sort((a, b) => a.pin.position - b.pin.position), [geometry]);
  // Preserve the source's physical pairs: GPIO is 1/2, Pico is 1/40. Each
  // side keeps its own column, so an uneven side never drops or shifts pins.
  const connectorPins = useMemo(() => {
    const pins = board.pinout?.pins;
    const anchorFor = (pin: Pin) => anchors.find((anchor) => anchor.pin === pin);
    if (!pins) return anchors.map((item, index) => ({ item, row: Math.floor(index / 2), col: (index % 2) as 0 | 1 }));
    return connectorCells(pins.left.map(anchorFor), pins.right.map(anchorFor))
      .flatMap(({ item, row, col }) => (item ? [{ item, row, col }] : []));
  }, [anchors, board.pinout]);
  // Roving tab stop: the last pin focused in the list, moved to the selected
  // pin whenever the selection changes elsewhere (picker, board pads), so Tab
  // re-enters the list at the pin the readout describes.
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [seenSelection, setSeenSelection] = useState<string | null>(null);
  if (seenSelection !== selectedKey) {
    setSeenSelection(selectedKey);
    if (selectedKey) setFocusKey(selectedKey);
  }
  const tabStop = connectorPins.some(({ item }) => item.key === focusKey) ? focusKey : connectorPins[0]?.item.key;
  const roleCounts = useMemo(() => countRoles(anchors.map(({ pin }) => pin)), [anchors]);
  const source = verificationSourceFor(board);
  const sourceInfo = source ? { ...source, provenance: classifySource(board.vendor, source.url) } : undefined;
  const report = useMemo(() => pinReportContextFor(board), [board]);
  const caution = fiveVoltCaution(board);
  useEffect(() => {
    const index = connectorPins.findIndex(({ item }) => item.key === selectedKey);
    const element = pinRefs.current[index];
    const region = connectorRef.current;
    if (!element || !region) return;
    // Reveal a picker selection inside the connector, without scrolling the
    // surrounding detail panel away from its readout.
    const pinBox = element.getBoundingClientRect();
    const regionBox = region.getBoundingClientRect();
    if (pinBox.top < regionBox.top) region.scrollTop -= regionBox.top - pinBox.top;
    else if (pinBox.bottom > regionBox.bottom) region.scrollTop += pinBox.bottom - regionBox.bottom;
  }, [connectorPins, selectedKey]);
  useEffect(() => {
    const region = boardScrollRef.current;
    if (!zoomed || !region || !selectedKey) return;
    const pad = region.querySelector(`[data-pin-key="${CSS.escape(selectedKey)}"]`);
    if (!pad) return;
    const padBox = pad.getBoundingClientRect();
    const regionBox = region.getBoundingClientRect();
    region.scrollLeft += padBox.left + padBox.width / 2 - (regionBox.left + regionBox.width / 2);
    region.scrollTop += padBox.top + padBox.height / 2 - (regionBox.top + regionBox.height / 2);
  }, [zoomed, selectedKey]);
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
        {/* The board is already named by the page or panel around this map. */}
        <h3>{board.pinout.connector}</h3>
        <div className="pi-tools">
          <button ref={expandRef} type="button" onClick={() => setExpanded(true)}><Expand size={14} aria-hidden="true" /> Inspect</button>
          <a href={`/pinout/${board.id}`} aria-label={`Open the ${board.name} full pinout`}><ExternalLink size={14} aria-hidden="true" /><span>Full view</span></a>
        </div>
      </header>

      <div className="pi-component-layout">
        <div className={`pi-canvas ${model.family === "pico" ? "pi-canvas-pico" : ""}`}>
          <p className="pi-board-orientation">{geometry.orientation}</p>
          <div ref={boardScrollRef} className="pi-canvas-scroll" data-zoomed={zoomed || undefined}
            {...(zoomed ? { tabIndex: 0, role: "group", "aria-label": "Scrollable board at touch size" } : {})}>
            <div className="pi-board-frame" data-board-view={zoomed ? "touch" : "fit"}
              style={{ aspectRatio: `${geometry.body.w + 48} / ${geometry.body.h + 55}`, ...(zoomed ? { boxSizing: "content-box", minWidth: touchDrawingWidth(geometry, true), maxWidth: "none" } : {}) }}>
              <BoardStage geometry={geometry} title={`${board.name} physical board — ${board.pinout.connector}`} sheetLabel={board.name}
                compact selectedKey={selectedKey} activeKey={liveKey} activeRole={activeRole} showAllLabels={false} netKeys={probe.keys} onSelect={select} onActiveKey={setHoverKey} />
            </div>
          </div>
          <div className="pi-canvas-footer">
            <span>{zoomed ? "Touch size · every pad has a 44 px target · swipe to pan" : "Whole board · pads are small at this size"}</span>
            <button type="button" aria-pressed={zoomed} onClick={() => setZoomed(!zoomed)}>
              {zoomed ? <ZoomOut size={14} aria-hidden="true" /> : <ZoomIn size={14} aria-hidden="true" />}{zoomed ? "Fit whole board" : "Zoom to touch size"}
            </button>
          </div>
        </div>

        <aside className="pi-readout">
          <PinDetails anchor={liveAnchor} pinned={selectedKey !== null} net={probe.net} netSize={probe.keys.size} flagNotes={board.pinFunctions?.flagNotes} report={report} onClear={() => select(null)} />

          <div className="pi-electrical-note">
            <p><ShieldAlert size={14} aria-hidden="true" /><span><strong>{board.logicLevel}</strong>{caution ? <> · {caution}</> : null}</span></p>
            {sourceInfo ? <a className="pi-source" href={sourceInfo.url} target="_blank" rel="noopener noreferrer">Verify in {sourceInfo.provenance === "official" ? "official" : "linked"} docs <ExternalLink size={12} aria-hidden="true" /></a> : null}
          </div>
        </aside>
      </div>

      <section className="pi-pin-list" aria-label="Pin list">
        <div className="pi-connector-heading">
          <p>Pick a pin by name: the board pads, this list and the picker select the same pin. Keyboard: arrows, then Enter.</p>
          <select className="pi-pin-picker" aria-label="Select physical pin" value={selectedKey ?? ""} onChange={(event) => select(event.target.value || null)}>
            <option value="">Choose a pin…</option>
            {anchors.map(({ key, pin }) => <option key={key} value={key}>{pin.position} · {pin.label}{pin.aliases?.length ? ` / ${pin.aliases.join(", ")}` : ""}</option>)}
          </select>
          <p className="pi-connector-orientation">Physical pin pairs · {model.family === "pico" ? "1 opposite 40" : "odd / even"} · scroll for all {anchors.length} pins</p>
        </div>
        <div ref={connectorRef} className="pi-connector-scroll" role="group" aria-label="Select a physical pin from the connector">
          <div className="pi-connector-grid">
            {connectorPins.map(({ item: anchor, row, col }, index) => <button key={anchor.key} type="button"
              ref={(element) => { pinRefs.current[index] = element; }}
              aria-label={pinAccessibleLabel(anchor.pin)} aria-pressed={selectedKey === anchor.key}
              tabIndex={tabStop === anchor.key ? 0 : -1}
              className="pi-connector-pin" data-selected={selectedKey === anchor.key || undefined}
              data-dimmed={activeRole !== null && activeRole !== anchor.pin.role || undefined}
              style={{ borderInlineStartColor: roleColors[anchor.pin.role].edge, gridRow: row + 1, gridColumn: col + 1 }}
              onFocus={() => setFocusKey(anchor.key)}
              onClick={() => select(selectedKey === anchor.key ? null : anchor.key)}
              onKeyDown={(event) => {
                const next = connectorKeyTarget(connectorPins, index, event.key);
                if (next !== null) { event.preventDefault(); pinRefs.current[next]?.focus(); }
              }}>
              <span className="pi-connector-number">{anchor.pin.position}</span>
              <span className="pi-connector-signal"><strong>{anchor.pin.label}</strong>
                <small>{anchor.pin.aliases?.slice(0, 2).join(" / ") || roleLabels[anchor.pin.role]}</small>
              </span>
            </button>)}
          </div>
        </div>
      </section>

      <details className="pi-role-disclosure">
        <summary>Highlight pin roles{activeRole ? ` · ${roleLabels[activeRole]}` : ""}</summary>
        <div className="pi-role-bar"><PinRoleLegend counts={roleCounts} activeRole={activeRole} onToggle={setActiveRole} />
          {activeRole ? <button className="pi-clear" type="button" onClick={() => setActiveRole(null)}>Show all roles</button> : null}
        </div>
      </details>

      <p className="pi-illustration-note">{geometry.revisionNote} Decorative traces do not represent electrical connections.</p>

      <details className="pin-reference-table pi-schedule">
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
              <td>{pin.aliases?.length ? <span>{pin.aliases.join(" / ")}</span> : <span className="pi-muted">{roleLabels[pin.role]}</span>}<PinCautions pin={pin} flagNotes={board.pinFunctions?.flagNotes} /></td>
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
