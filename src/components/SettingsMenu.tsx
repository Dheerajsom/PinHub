"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  CircuitBoard,
  Monitor,
  Moon,
  Rows3,
  Settings,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { usePopoverPlacement } from "@/components/usePopoverPlacement";
import { clearFavorites, useFavorites } from "@/lib/favorites";
import { clearAllPinhubData } from "@/lib/local-data";
import { setMotionChoice, useMotionChoice, type MotionChoice } from "@/lib/motion";
import { usePersonalLibrary } from "@/lib/personal-library";
import { setPinoutTab, usePinoutTab, type PinoutTab } from "@/lib/pinout-tab";
import { setThemeChoice, useThemeChoice, type ThemeChoice } from "@/lib/theme";

/**
 * The header's settings disclosure: theme (including going back to the
 * system setting, which the one-tap toggle cannot do), reduced motion, which
 * pin map view boards open in, and what PinHub has saved in this browser.
 *
 * A disclosure (button + panel), like the Tools menu: Escape, a click
 * outside, or tabbing past the last control closes it. Every choice applies
 * at once; there is no Save step.
 */
export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = `${useId()}-settings`;
  const placement = usePopoverPlacement(rootRef, open, 320, 220);

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
      className="relative shrink-0"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (open && next && !event.currentTarget.contains(next)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Settings"
        title="Settings"
        onClick={() => setOpen((value) => !value)}
        className="ph-chrome-button ph-settings-trigger grid size-11 shrink-0 place-items-center rounded-xl text-zinc-300 transition hover:text-white active:scale-[0.96]"
      >
        <Settings className="size-4" aria-hidden="true" />
      </button>
      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label="Settings"
          tabIndex={-1}
          // Fixed, not absolute: the catalog header clips its overflow for
          // its background art, which cut an absolute panel off entirely.
          className="ph-tools-panel surface-panel fixed z-50 rounded-xl p-3 text-left"
          style={
            placement
              ? { left: placement.viewportLeft, top: placement.top, width: placement.width, maxHeight: placement.maxHeight, overflowY: "auto", overscrollBehavior: "contain" }
              : { visibility: "hidden" }
          }
        >
          <SettingsPanel />
        </div>
      ) : null}
    </div>
  );
}

const themeOptions: readonly SegmentOption<ThemeChoice>[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const motionOptions: readonly SegmentOption<MotionChoice>[] = [
  { value: "system", label: "Match system" },
  { value: "reduce", label: "Reduce" },
];

const pinoutOptions: readonly SegmentOption<PinoutTab>[] = [
  { value: "static", label: "Static", icon: Rows3 },
  { value: "dynamic", label: "Dynamic", icon: CircuitBoard },
];

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

function SettingsPanel() {
  const theme = useThemeChoice();
  const motion = useMotionChoice();
  const pinoutTab = usePinoutTab();
  const favorites = useFavorites();
  const library = usePersonalLibrary();
  const [status, setStatus] = useState("");
  const savedHeadingId = `${useId()}-saved`;

  const favoriteCount = favorites.size;
  const recentCount = library.recentBoardIds.length;
  const collectionCount = library.collections.length;
  const nothingSaved = favoriteCount === 0 && recentCount === 0 && collectionCount === 0;

  return (
    <div className="grid gap-3">
      <h2 className="text-sm font-semibold text-white">Settings</h2>

      <Segment
        legend="Theme"
        options={themeOptions}
        value={theme}
        onChange={(next) => {
          setThemeChoice(next);
          setStatus("");
        }}
      />

      <Segment
        legend="Motion"
        hint="Reduce turns off animations and smooth scrolling. A system request for less motion is always honored."
        options={motionOptions}
        value={motion}
        onChange={(next) => {
          setMotionChoice(next);
          setStatus("");
        }}
      />

      <Segment
        legend="Pin maps open in"
        hint="Switching views on a board changes this too."
        options={pinoutOptions}
        value={pinoutTab}
        onChange={(next) => {
          setPinoutTab(next);
          setStatus("");
        }}
      />

      <section aria-labelledby={savedHeadingId} className="ph-settings-rule grid gap-2 pt-3">
        <h3 id={savedHeadingId} className="text-[13px] font-medium text-zinc-200">
          Saved in this browser
        </h3>
        <DataRow
          label="Favorites"
          detail={plural(favoriteCount, "board", "boards")}
        >
          <ConfirmButton
            label="Clear"
            confirmLabel={`Clear ${plural(favoriteCount, "favorite", "favorites")}`}
            disabled={favoriteCount === 0}
            onConfirm={() => {
              setStatus(
                clearFavorites()
                  ? "Favorites cleared."
                  : "Your browser refused the change, so favorites come back when you reload.",
              );
            }}
          />
        </DataRow>
        <DataRow
          label="Recent boards and collections"
          detail={`${plural(recentCount, "recent board", "recent boards")}, ${plural(collectionCount, "collection", "collections")}`}
        />
        <ConfirmButton
          label="Clear everything PinHub saved"
          confirmLabel="Clear favorites, collections, and settings"
          disabled={nothingSaved && theme === "system" && motion === "system" && pinoutTab === "dynamic"}
          wide
          onConfirm={() => {
            const refused = clearAllPinhubData();
            setStatus(
              refused.length === 0
                ? "Everything PinHub saved in this browser is cleared."
                : `Your browser kept ${plural(refused.length, "item", "items")}. Clear this site's data in your browser settings to remove ${refused.length === 1 ? "it" : "them"}.`,
            );
          }}
        />
        <p role="status" className="min-h-0 text-xs leading-5 text-zinc-300 empty:hidden">
          {status}
        </p>
        <Link
          href="/privacy"
          className="inline-flex min-h-11 items-center self-start rounded-lg text-xs text-zinc-400 underline decoration-zinc-600 underline-offset-4 hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
        >
          What PinHub stores and why
        </Link>
      </section>
    </div>
  );
}

type SegmentOption<T extends string> = { value: T; label: string; icon?: LucideIcon };

/**
 * One setting as a native radio group, drawn as a segmented control. Native
 * radios bring arrow-key movement and the group semantics for free.
 */
function Segment<T extends string>({
  legend,
  hint,
  options,
  value,
  onChange,
}: {
  legend: string;
  hint?: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const name = useId();
  const hintId = `${name}-hint`;
  return (
    <fieldset className="grid min-w-0 gap-1.5" aria-describedby={hint ? hintId : undefined}>
      <legend className="mb-1.5 text-[13px] font-medium text-zinc-200">{legend}</legend>
      <div className="ph-settings-segment">
        {options.map(({ value: optionValue, label, icon: Icon }) => (
          <label key={optionValue} className="ph-settings-option">
            <input
              type="radio"
              name={name}
              value={optionValue}
              checked={value === optionValue}
              onChange={() => onChange(optionValue)}
              className="sr-only"
            />
            {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
            <span className="truncate">{label}</span>
          </label>
        ))}
      </div>
      {hint ? (
        <p id={hintId} className="text-xs leading-5 text-zinc-500">
          {hint}
        </p>
      ) : null}
    </fieldset>
  );
}

function DataRow({ label, detail, children }: { label: string; detail: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-11 min-w-0 items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs text-zinc-300">{label}</div>
        <div className="font-mono text-xs tabular-nums text-zinc-500">{detail}</div>
      </div>
      {children}
    </div>
  );
}

/**
 * A destructive button that asks once: the first press shows what will go
 * and a Cancel, the second does it. Nothing here can be undone.
 */
function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  disabled = false,
  wide = false,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  wide?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const wasArmed = useRef(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Keep keyboard focus in the panel as the buttons swap: onto the confirm
  // button when armed, back to the first button afterwards, or to the panel
  // itself when that button is now disabled (nothing left to clear).
  useEffect(() => {
    if (armed) {
      wasArmed.current = true;
      confirmRef.current?.focus();
      return;
    }
    if (!wasArmed.current) return;
    wasArmed.current = false;
    const trigger = triggerRef.current;
    if (trigger && !trigger.disabled) trigger.focus();
    else trigger?.closest<HTMLElement>('[role="region"]')?.focus();
  }, [armed]);

  if (!armed) {
    return (
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setArmed(true)}
        className={wide ? "ph-settings-action w-full justify-center" : "ph-settings-action"}
      >
        {label}
      </button>
    );
  }
  return (
    <div className={wide ? "grid gap-1.5" : "flex shrink-0 flex-wrap justify-end gap-1.5"}>
      <button
        ref={confirmRef}
        type="button"
        data-confirm=""
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
        className={wide ? "ph-settings-action w-full justify-center" : "ph-settings-action"}
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className={wide ? "ph-settings-action w-full justify-center" : "ph-settings-action"}
      >
        Cancel
      </button>
    </div>
  );
}
