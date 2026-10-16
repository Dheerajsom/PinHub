"use client";

import Image from "next/image";
import { memo, useEffect, useRef, useState } from "react";
import {
  HEX_LINE_HEIGHT,
  HEX_TOKEN_WIDTH,
  buildHexField,
  logoPlacements,
  type HexToken,
} from "@/components/background-field";
import { vendorFaviconUrl } from "@/lib/vendor-domains";

/** Radius of the cursor probe's light, in px. */
const PROBE_RADIUS = 170;

/**
 * The page background: the marks of the catalog's vendors scattered through
 * the desktop gutters in quiet monochrome, and a cursor probe. Where the
 * pointer rests on bare background, a soft light follows it, brings the
 * nearby marks back to colour, and reveals the bus traffic underneath: I2C
 * writes to common parts, and — for whoever decodes the ASCII — a message.
 *
 * The probe needs a fine hovering pointer and a desktop-width window, and it
 * stays dark while the pointer is over a panel, so it never competes with
 * the content. Nothing here is interactive or announced to assistive tech.
 */
export function CircuitBackground() {
  const haloRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const [field, setField] = useState<HexToken[][] | null>(null);

  useEffect(() => {
    // No matchMedia (some embedded browsers, test DOMs): leave the probe off.
    if (typeof window.matchMedia !== "function") return undefined;
    const capable = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 1024px)");
    let teardown: (() => void) | undefined;

    const start = () => {
      const halo = haloRef.current;
      const view = viewRef.current;
      if (!halo || !view) return undefined;

      let x = -1000;
      let y = -1000;
      let frame = 0;
      let resizeTimer = 0;

      const size = () =>
        setField(
          buildHexField(
            Math.ceil(window.innerWidth / HEX_TOKEN_WIDTH) + 2,
            Math.ceil(window.innerHeight / HEX_LINE_HEIGHT) + 2,
          ),
        );
      size();

      const paint = () => {
        frame = 0;
        // The halo moves to the pointer; the view inside it moves the other
        // way, so its contents stay pinned to the viewport. Both are
        // transforms, so following the cursor never triggers layout.
        halo.style.transform = `translate3d(${x - PROBE_RADIUS}px, ${y - PROBE_RADIUS}px, 0)`;
        view.style.transform = `translate3d(${PROBE_RADIUS - x}px, ${PROBE_RADIUS - y}px, 0)`;
      };

      // Whether the probe is lit is decided once per element the pointer
      // moves onto, not on every move.
      let lastTarget: EventTarget | null = null;
      const onMove = (event: PointerEvent) => {
        if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
        x = event.clientX;
        y = event.clientY;
        if (event.target !== lastTarget) {
          lastTarget = event.target;
          halo.dataset.lit = String(isBareBackground(event.target));
        }
        if (!frame) frame = requestAnimationFrame(paint);
      };
      const onOut = (event: PointerEvent) => {
        if (event.relatedTarget) return;
        lastTarget = null;
        halo.dataset.lit = "false";
      };
      const onResize = () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(size, 150);
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerout", onOut, { passive: true });
      window.addEventListener("resize", onResize);
      return () => {
        cancelAnimationFrame(frame);
        window.clearTimeout(resizeTimer);
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerout", onOut);
        window.removeEventListener("resize", onResize);
        halo.dataset.lit = "false";
      };
    };

    const sync = () => {
      teardown?.();
      teardown = capable.matches ? start() : undefined;
      if (!capable.matches) setField(null);
    };
    sync();
    capable.addEventListener("change", sync);
    return () => {
      capable.removeEventListener("change", sync);
      teardown?.();
    };
  }, []);

  return (
    <div className="ph-backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="ph-backdrop-base absolute inset-0" />
      <LogoField lit={false} />

      <div
        ref={haloRef}
        className="ph-probe"
        data-lit="false"
        style={{ width: PROBE_RADIUS * 2, height: PROBE_RADIUS * 2 }}
      >
        <div ref={viewRef} className="ph-probe-view">
          {field ? <HexField field={field} /> : null}
          {field ? <LogoField lit /> : null}
        </div>
      </div>

      <div className="ph-backdrop-vignette absolute inset-0" />
    </div>
  );
}

/**
 * True when the element under the pointer shows the page background: no
 * ancestor below <main> paints a background of its own.
 */
export function isBareBackground(target: EventTarget | null): boolean {
  let element = target instanceof Element ? target : null;
  while (element && element.tagName !== "MAIN" && element !== document.body) {
    if (element instanceof HTMLImageElement || element instanceof SVGElement) return false;
    const { backgroundColor, backgroundImage } = getComputedStyle(element);
    if ((backgroundImage && backgroundImage !== "none") || !isTransparent(backgroundColor)) return false;
    element = element.parentElement;
  }
  return element !== null;
}

function isTransparent(color: string): boolean {
  if (!color || color === "transparent") return true;
  const alpha = /rgba?\([^)]*[,/]\s*([\d.]+)\s*\)/.exec(color)?.[1];
  return alpha !== undefined && Number(alpha) === 0;
}

const LogoField = memo(function LogoField({ lit }: { lit: boolean }) {
  return (
    <div className={`ph-logo-field${lit ? " ph-logo-field-lit" : ""}`}>
      {logoPlacements.map((logo, index) => (
        <Image
          key={index}
          src={vendorFaviconUrl(logo.domain, 128)}
          alt=""
          width={logo.size}
          height={logo.size}
          loading={lit ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          className="ph-logo"
          style={{
            left: `calc(50% + ${logo.x - logo.size / 2}px)`,
            top: logo.y - logo.size / 2,
            transform: `rotate(${logo.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
});

const HexField = memo(function HexField({ field }: { field: HexToken[][] }) {
  return (
    <div className="ph-hex-field">
      {field.map((row, rowIndex) => (
        <div key={rowIndex} className="ph-hex-row">
          {mergeRuns(row).map((run, runIndex) => (
            <span key={runIndex} className={`ph-hex-${run.kind}`}>
              {run.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
});

/** Joins neighbouring tokens of the same kind into one span to keep the DOM small. */
export function mergeRuns(row: HexToken[]): HexToken[] {
  const runs: HexToken[] = [];
  for (const token of row) {
    const last = runs[runs.length - 1];
    if (last && last.kind === token.kind) last.text += ` ${token.text}`;
    else runs.push({ text: runs.length ? ` ${token.text}` : token.text, kind: token.kind });
  }
  return runs;
}
