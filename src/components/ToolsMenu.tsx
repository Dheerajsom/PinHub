"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { ChevronDown, Wrench } from "lucide-react";
import { siteTools } from "@/components/site-sections";

/**
 * The Tools entry in the section nav: one button that opens a short list of
 * PinHub's workflows, each with a plain sentence about what it does. A newcomer
 * reads "Check code: paste a sketch…" instead of guessing what "Check" means.
 *
 * A disclosure (button + list of links), not an ARIA menu: every item is an
 * ordinary link reached with Tab, and Escape or a click outside closes it.
 */
export function ToolsMenu({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = `${useId()}-tools`;
  const currentTool = siteTools.find((tool) => tool.href === current);

  // Where the list sits, in px from the button's left edge. It prefers to
  // line up with the button's right edge, but the nav is not always the
  // row's last item (the catalog puts search after it), so it is clamped to
  // stay 16 px inside the viewport on any screen.
  const [placement, setPlacement] = useState<{ left: number; width: number; maxHeight: number } | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gutter = 16;
      const width = Math.min(320, window.innerWidth - gutter * 2);
      const preferred = rect.right - width;
      const left = Math.min(Math.max(preferred, gutter), window.innerWidth - gutter - width);
      // A phone in landscape is ~390 px tall and the catalog's command bar is
      // sticky, so the list scrolls inside itself rather than run off screen.
      const maxHeight = Math.max(176, window.innerHeight - rect.bottom - 8 - gutter);
      setPlacement({ left: left - rect.left, width, maxHeight });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative text-xs"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
      onBlur={(event) => {
        // Tabbing past the last tool closes the list, like leaving a menu. A
        // null target is a click on the panel's own padding (or a window
        // switch); the pointerdown-outside handler covers real outside clicks.
        const next = event.relatedTarget as Node | null;
        if (open && next && !event.currentTarget.contains(next)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={clsx(
          "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-medium transition max-[440px]:px-2",
          currentTool
            ? "bg-cyan-300/10 text-cyan-100 ring-1 ring-inset ring-cyan-300/35"
            : "ph-nav-link text-zinc-500",
        )}
      >
        <Wrench className="size-3.5 max-[559px]:hidden" aria-hidden="true" />
        Tools
        {currentTool ? <span className="sr-only">, current: {currentTool.label}</span> : null}
        <ChevronDown
          className={clsx("size-3.5 transition-transform motion-reduce:transition-none", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div
          id={panelId}
          className="ph-tools-panel surface-panel absolute top-full z-50 mt-2 rounded-xl p-1.5"
          style={
            placement
              ? { left: placement.left, width: placement.width, maxHeight: placement.maxHeight, overflowY: "auto", overscrollBehavior: "contain" }
              : { right: 0, width: "min(20rem, calc(100vw - 2rem))" }
          }
        >
          <ul className="grid gap-0.5">
            {siteTools.map(({ href, label, summary, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={href === current ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className="ph-tools-item flex min-h-11 items-start gap-3 rounded-lg px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                >
                  <Icon className="mt-0.5 size-4 shrink-0 text-cyan-200" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-white">{label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-zinc-400">{summary}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
