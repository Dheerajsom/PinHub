"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { clsx } from "clsx";
import { ArrowDownUp, Check, ChevronDown } from "lucide-react";
import type { CatalogSort } from "@/lib/catalog-state";

export type SortOption = { value: CatalogSort; label: string };

/**
 * Every sort the catalog and discovery toolbars can offer, in menu order.
 * "Best match" only means something once there is a query, so callers pass
 * `hasQuery` and it drops out otherwise.
 */
export const sortOptionLabels: Record<CatalogSort, string> = {
  relevance: "Best match",
  catalog: "Catalog order",
  name: "Name A–Z",
  vendor: "Vendor A–Z",
  recentlyAdded: "Recently added",
  interfaceCount: "Most interfaces",
};

export function sortOptionsFor(
  sorts: readonly CatalogSort[],
  hasQuery: boolean,
): SortOption[] {
  return sorts
    .filter((value) => hasQuery || value !== "relevance")
    .map((value) => ({ value, label: sortOptionLabels[value] }));
}

type SortMenuProps = {
  value: CatalogSort;
  options: SortOption[];
  onChange: (value: CatalogSort) => void;
  className?: string;
};

/**
 * A select-only combobox (WAI-ARIA APG pattern) for the board sort. It
 * replaces a native <select> whose OS-drawn list ignored the theme and whose
 * mouse focus ring floated a gap away from the control. Focus stays on the
 * trigger; the highlighted option is tracked with aria-activedescendant.
 */
export function SortMenu({ value, options, onChange, className }: SortMenuProps) {
  const id = useId();
  const listId = `${id}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [alignEnd, setAlignEnd] = useState(false);
  const [maxHeight, setMaxHeight] = useState<number>();
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  // Flip the menu to the trigger's right edge when opening it from the left
  // edge would run past the viewport (the toolbar wraps on narrow screens),
  // and cap its height to the space below the trigger so the last rows stay
  // reachable on a landscape phone. Three rows is the floor.
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = Math.max(rect.width, 224);
    setAlignEnd(rect.left + menuWidth > window.innerWidth - 8);
    setMaxHeight(Math.max(152, window.innerHeight - rect.bottom - 14));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document
      .getElementById(`${id}-option-${active}`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [open, active, id]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const openMenu = (index = selectedIndex) => {
    setActive(index);
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    setOpen(false);
    triggerRef.current?.focus();
    if (option && option.value !== value) onChange(option.value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openMenu();
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((index) => Math.min(last, index + 1));
        return;
      case "ArrowUp":
        event.preventDefault();
        setActive((index) => Math.max(0, index - 1));
        return;
      case "Home":
        event.preventDefault();
        setActive(0);
        return;
      case "End":
        event.preventDefault();
        setActive(last);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(active);
        return;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        return;
      case "Tab":
        setOpen(false);
        return;
      default:
        if (event.key.length === 1) {
          const letter = event.key.toLowerCase();
          const match = options.findIndex((option, index) =>
            index > active && option.label.toLowerCase().startsWith(letter),
          );
          const wrapped = match >= 0
            ? match
            : options.findIndex((option) => option.label.toLowerCase().startsWith(letter));
          if (wrapped >= 0) setActive(wrapped);
        }
    }
  };

  return (
    <div ref={rootRef} className={clsx("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label="Sort boards"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={clsx(
          "ph-sort-trigger flex min-h-11 w-full items-center gap-1.5 rounded-lg border px-2.5 font-medium transition sm:gap-2 sm:px-3",
          open
            ? "border-cyan-300/70 bg-cyan-300/10 text-cyan-50"
            : "border-white/10 text-zinc-300 hover:border-white/25 hover:text-white",
        )}
      >
        <ArrowDownUp className="size-3.5 shrink-0 opacity-70 max-sm:hidden" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left">{sortOptionLabels[value]}</span>
        <ChevronDown
          className={clsx(
            "size-3.5 shrink-0 opacity-60 transition-transform motion-reduce:transition-none",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      <div
        id={listId}
        role="listbox"
        aria-label="Sort boards"
        hidden={!open}
        style={{ maxHeight }}
        className={clsx(
          "ph-sort-menu surface-panel absolute top-full z-50 mt-1.5 w-max min-w-full overflow-y-auto overscroll-contain rounded-xl p-1",
          alignEnd ? "right-0" : "left-0",
        )}
      >
        <p className="px-2.5 pb-1 pt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500" aria-hidden="true">
          Sort by
        </p>
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <div
              key={option.value}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={selected}
              data-active={open && index === active ? "" : undefined}
              onPointerMove={() => setActive(index)}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
              className="ph-sort-option flex min-h-11 min-w-52 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-[13px]"
            >
              <span className="flex-1">{option.label}</span>
              <Check
                className={clsx("size-3.5 shrink-0", selected ? "opacity-100" : "opacity-0")}
                aria-hidden="true"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
