"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { clsx } from "clsx";
import { Check, ChevronDown, Search } from "lucide-react";

/**
 * The list opens downward in the flow, which on a phone can leave it under the
 * fold. Inside a scrolling rail (desktop), "nearest" is enough. When the page
 * itself scrolls, a sticky header (marked `data-sticky-header`) covers the top
 * of the viewport, so the panel is placed below it: bottom-aligned when it
 * fits, otherwise with its search field just under the header (landscape
 * phones). Instant when the reader prefers reduced motion.
 */
function revealPanel(panel: HTMLElement) {
  const behavior: ScrollBehavior = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches
    ? "auto"
    : "smooth";
  for (let node = panel.parentElement; node && node !== document.body; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && node.scrollHeight > node.clientHeight) {
      panel.scrollIntoView?.({ block: "nearest", behavior });
      return;
    }
  }
  const header = document.querySelector("[data-sticky-header]");
  const top = Math.max(0, header?.getBoundingClientRect().bottom ?? 0) + 8;
  const bottom = window.innerHeight - 12;
  const rect = panel.getBoundingClientRect();
  if (!rect.height) return; // not laid out (hidden, or a test DOM)
  const delta =
    rect.height <= bottom - top
      ? rect.bottom > bottom
        ? rect.bottom - bottom
        : rect.top < top
          ? rect.top - top
          : 0
      : rect.top - top;
  if (delta) window.scrollBy?.({ top: delta, behavior });
}

type FacetMenuProps = {
  title: string;
  icon: ReactNode;
  /** Every option in menu order; the first is the "no filter" option. */
  items: readonly string[];
  active: string;
  /** Boards in the catalog per option, shown beside each one. */
  counts: ReadonlyMap<string, number>;
  /** What the first option reads as in the menu, e.g. "All manufacturers". */
  allLabel: string;
  /** Plural noun for the empty state: "No manufacturers match …". */
  noun: string;
  onChange: (value: string) => void;
  /** Optional mark drawn before an option, such as a vendor logo. */
  renderMark?: (item: string) => ReactNode;
};

/**
 * A themed single-choice filter for long facets (38 manufacturers, 90-odd
 * processor families). It replaces a native <select>, whose OS-drawn list
 * ignored the theme and offered no way to narrow a long list.
 *
 * The list opens in place inside its panel rather than floating: the filter
 * rail scrolls on its own, and a floating popup would be clipped by it. Focus
 * moves to a type-to-narrow field (an editable combobox, WAI-ARIA APG) and the
 * highlighted option is tracked with aria-activedescendant.
 */
export function FacetMenu({
  title,
  icon,
  items,
  active,
  counts,
  allLabel,
  noun,
  onChange,
  renderMark,
}: FacetMenuProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const panelId = `${id}-panel`;
  const listId = `${id}-list`;
  const rootRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const allValue = items[0];
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    // "All" stays first so clearing the filter is always one step away.
    return items.filter(
      (item, index) => index === 0 || item.toLowerCase().includes(needle),
    );
  }, [items, query]);
  const matchCount = filtered.length - 1;
  const filtering = active !== allValue;
  const labelFor = (item: string) => (item === allValue ? allLabel : item);

  useEffect(() => {
    if (!open) return;
    // preventScroll: the scroll below decides where the list lands, so focus
    // must not jump the page first.
    inputRef.current?.focus({ preventScroll: true });
    if (panelRef.current) revealPanel(panelRef.current);
  }, [open]);

  // Keep the highlighted option visible by scrolling the list alone.
  // scrollIntoView would also scroll the page, and that instant scroll cancels
  // the smooth one that reveals the panel on open.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const option = document.getElementById(`${id}-option-${activeIndex}`);
    if (!list || !option) return;
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    }
  }, [open, activeIndex, id]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const openMenu = () => {
    setQuery("");
    setActiveIndex(Math.max(0, items.indexOf(active)));
    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const choose = (item: string | undefined) => {
    if (item === undefined) return;
    closeMenu();
    if (item !== active) onChange(item);
  };

  const narrow = (value: string) => {
    setQuery(value);
    // Land on the first real match, not on "All", once something is typed.
    setActiveIndex(value.trim() ? 1 : 0);
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openMenu();
    } else if (!open && event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey && !event.altKey) {
      // Typing on the closed trigger opens the list already narrowed.
      event.preventDefault();
      openMenu();
      narrow(event.key);
    }
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const last = filtered.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(last, index + 1));
        return;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(0, index - 1));
        return;
      case "PageDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(last, index + 8));
        return;
      case "PageUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(0, index - 8));
        return;
      case "Enter":
        event.preventDefault();
        choose(filtered[Math.min(activeIndex, last)]);
        return;
      case "Escape":
        event.preventDefault();
        if (query) narrow("");
        else closeMenu();
        return;
      case "Tab":
        setOpen(false);
        return;
    }
  };

  return (
    <section ref={rootRef} className="surface-panel rounded-xl p-3">
      <div id={titleId} className="mb-2 flex items-center gap-2 px-1">
        <span className="grid size-7 shrink-0 place-items-center rounded-md border border-white/10 bg-[#0a0c11]">
          {icon}
        </span>
        <span className="text-[13px] font-semibold tracking-tight text-white">
          {title}
        </span>
      </div>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={panelId}
        aria-labelledby={`${titleId} ${id}-value`}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onTriggerKeyDown}
        data-filtering={filtering ? "" : undefined}
        className={clsx(
          "ph-facet-trigger flex min-h-11 w-full items-center gap-2 rounded-lg border px-2.5 text-left transition",
          open || filtering
            ? "border-cyan-300/60 text-cyan-50"
            : "border-white/10 text-zinc-200 hover:border-white/25",
        )}
      >
        {filtering && renderMark ? renderMark(active) : null}
        <span id={`${id}-value`} className="min-w-0 flex-1 truncate">
          {labelFor(active)}
        </span>
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-zinc-500">
          {counts.get(active)}
        </span>
        <ChevronDown
          className={clsx(
            "size-3.5 shrink-0 opacity-60 transition-transform motion-reduce:transition-none",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className="ph-facet-panel surface-well mt-2 scroll-mb-3 overflow-hidden rounded-lg"
      >
        <div className="ph-facet-search flex items-center gap-2 border-b border-white/10 px-2.5">
          <Search className="size-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label={`Narrow ${title.toLowerCase()} list`}
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
            value={query}
            onChange={(event) => narrow(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={`Search ${items.length - 1} ${noun}`}
            maxLength={40}
            autoComplete="off"
            spellCheck={false}
            className="ph-facet-input h-10 min-w-0 flex-1 bg-transparent text-zinc-200 outline-none placeholder:text-zinc-500"
          />
        </div>
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={titleId}
          className="relative max-h-72 overflow-y-auto overscroll-contain p-1"
        >
          {filtered.map((item, index) => {
            const selected = item === active;
            return (
              <div
                key={item}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={selected}
                data-active={open && index === activeIndex ? "" : undefined}
                onPointerMove={() => setActiveIndex(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
                className="ph-menu-option flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-[13px] lg:min-h-9"
              >
                {renderMark && index > 0 ? (
                  <span className="grid size-4 shrink-0 place-items-center">
                    {renderMark(item)}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate">{labelFor(item)}</span>
                <span className="ph-facet-count shrink-0 font-mono text-[10px] tabular-nums">
                  {counts.get(item)}
                </span>
                <Check
                  className={clsx("size-3.5 shrink-0", selected ? "opacity-100" : "opacity-0")}
                  aria-hidden="true"
                />
              </div>
            );
          })}
        </div>
        {query.trim() && matchCount === 0 ? (
          <p className="px-3 pb-3 pt-1 text-xs text-zinc-400" role="status">
            No {noun} match “{query.trim()}”. Press Escape to clear.
          </p>
        ) : null}
      </div>
    </section>
  );
}
