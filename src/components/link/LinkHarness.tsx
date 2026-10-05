"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Copy } from "lucide-react";
import type { Board } from "@/lib/boards";
import { linkToText, type BoardLink, type LinkWire, type WireEnd } from "@/lib/board-link";

/**
 * The wire list, drawn as a harness: each row is one wire between a pin on
 * board A and a pin on board B. The run between them shows which way the
 * signal travels, and a level shifter sits in the run when the records call
 * for one, so the part is drawn where it goes.
 */
export function LinkHarness({
  link,
  a,
  b,
  activeIndex,
  onActivate,
}: {
  link: BoardLink;
  a: Board;
  b: Board;
  activeIndex: number | null;
  onActivate: (index: number | null) => void;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(linkToText(link, a, b));
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopyState("idle"), 1600);
  }

  return (
    <section aria-labelledby="link-wires" className="surface-panel min-w-0 rounded-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--panel-border)] px-4 py-2.5">
        <h2 id="link-wires" className="text-sm font-semibold tracking-tight text-white">
          {link.wires.length} wires
        </h2>
        <button type="button" onClick={copy} className="ph-link-ghost">
          {copyState === "copied" ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <Copy className="size-3.5" aria-hidden="true" />
          )}
          <span aria-live="polite">
            {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy wire list"}
          </span>
        </button>
      </div>
      <div className="ph-link-heads" aria-hidden="true">
        <span>A · {a.name}</span>
        <span />
        <span className="text-right">B · {b.name}</span>
      </div>
      <ol className="grid">
        {link.wires.map((wire, index) => (
          <WireRow
            key={`${wire.name}-${index}`}
            wire={wire}
            number={index + 1}
            bus={link.bus}
            aName={a.name}
            bName={b.name}
            active={activeIndex === index}
            onToggle={() => onActivate(activeIndex === index ? null : index)}
          />
        ))}
      </ol>
      <PinCautions link={link} aName={a.name} bName={b.name} />
    </section>
  );
}

/**
 * Every caution the records state for a linked pin, quoted once: two pins
 * that share a note (the UNO's D0 and D1) are listed together under it.
 */
function PinCautions({ link, aName, bName }: { link: BoardLink; aName: string; bName: string }) {
  const groups = new Map<string, { label: string; note: string; pins: string[] }>();
  for (const wire of link.wires) {
    for (const [name, end] of [
      [aName, wire.a],
      [bName, wire.b],
    ] as const) {
      for (const caution of end.cautions) {
        const key = `${name}|${caution.label}|${caution.note}`;
        const group = groups.get(key) ?? { label: caution.label, note: caution.note, pins: [] };
        const pin = `${name} ${end.pin.label}`;
        if (!group.pins.includes(pin)) group.pins.push(pin);
        groups.set(key, group);
      }
    }
  }
  if (!groups.size) return null;
  return (
    <div className="ph-link-cautions">
      <h3 className="ph-link-cautions-title">Pin cautions from the records</h3>
      <ul className="grid gap-1.5">
        {[...groups.values()].map((group) => (
          <li key={`${group.pins.join()}-${group.label}-${group.note}`}>
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>
              <strong>
                {group.pins.join(", ")}
                {group.label === "note" ? "" : ` · ${group.label}`}
              </strong>{" "}
              {group.note}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function directionText(wire: LinkWire, aName: string, bName: string): string {
  if (wire.direction === "a-to-b") return `from ${aName} to ${bName}`;
  if (wire.direction === "b-to-a") return `from ${bName} to ${aName}`;
  if (wire.direction === "both") return "shared line";
  return "common ground";
}

function WireRow({
  wire,
  number,
  bus,
  aName,
  bName,
  active,
  onToggle,
}: {
  wire: LinkWire;
  number: number;
  bus: BoardLink["bus"];
  aName: string;
  bName: string;
  active: boolean;
  onToggle: () => void;
}) {
  const cautioned = wire.a.cautions.length + wire.b.cautions.length > 0;
  const label = `Wire ${number}, ${wire.name}: ${aName} ${endLabel(wire.a)} to ${bName} ${endLabel(wire.b)}, ${directionText(wire, aName, bName)}${
    wire.viaShifter ? ", through a level shifter" : ""
  }${cautioned ? ". The records state a caution for this wire; see pin cautions" : ""}`;
  return (
    <li className="ph-link-wire" data-active={active ? "" : undefined} data-kind={wire.kind === "ground" ? "ground" : bus}>
      <button type="button" aria-pressed={active} aria-label={label} onClick={onToggle} className="ph-link-wire-button">
        <End end={wire.a} align="start" />
        <span className="ph-link-run" data-direction={wire.direction} aria-hidden="true">
          <span className="ph-link-name">{wire.name}</span>
          <span className="ph-link-cable">
            <span className="ph-link-line" />
            {wire.viaShifter ? <span className="ph-link-shifter">LS</span> : null}
            <span className="ph-link-line" />
          </span>
        </span>
        <End end={wire.b} align="end" />
      </button>
    </li>
  );
}

function endLabel(end: WireEnd): string {
  return `${end.group ? `${end.group} ` : ""}pin ${end.pin.position}, ${end.pin.label}`;
}

function End({ end, align }: { end: WireEnd; align: "start" | "end" }) {
  return (
    <span className="ph-link-end" data-align={align}>
      <span className="ph-link-ferrule-row">
        <span className="ph-link-ferrule">
          <span className="ph-link-pos">{end.pin.position}</span>
          <span className="ph-link-label">{end.pin.label}</span>
        </span>
        {end.cautions.length ? <AlertTriangle className="ph-link-flag size-3.5 shrink-0" aria-hidden="true" /> : null}
      </span>
      <span className="ph-link-meta">
        {end.group ? `${end.group} · ` : ""}
        {end.signal}
      </span>
      {end.alternatives.length ? (
        <span className="ph-link-meta">also {end.alternatives.map((pin) => pin.label).join(", ")}</span>
      ) : null}
    </span>
  );
}
