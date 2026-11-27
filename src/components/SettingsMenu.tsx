"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Check,
  CircuitBoard,
  Monitor,
  Moon,
  Rows3,
  Settings,
  Sun,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  colorways,
  defaultColorway,
  setColorway,
  useColorway,
  type ColorwayInfo,
} from "@/lib/colorway";
import { clearFavorites, useFavorites } from "@/lib/favorites";
import { clearAllPinhubData } from "@/lib/local-data";
import { setMotionChoice, useMotionChoice, type MotionChoice } from "@/lib/motion";
import { usePersonalLibrary } from "@/lib/personal-library";
import { setPinoutTab, usePinoutTab, type PinoutTab } from "@/lib/pinout-tab";
import { setThemeChoice, useShownTheme, useThemeChoice, type ThemeChoice } from "@/lib/theme";

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The header's settings button and the dialog it opens: colorway and
 * light/dark, reduced motion, which pin map view boards open in, and what
 * PinHub has saved in this browser.
 *
 * A modal dialog: focus moves into it and stays there, Escape or the scrim
 * closes it, and focus returns to the button. Every choice applies at once,
 * so the page behind it previews the colorway; there is no Save step.
 */
export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogId = `${useId()}-settings`;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-label="Settings"
        title="Settings"
        onClick={() => setOpen(true)}
        className="ph-chrome-button ph-settings-trigger grid size-11 shrink-0 place-items-center rounded-xl text-zinc-300 transition hover:text-white active:scale-[0.96]"
      >
        <Settings className="size-4" aria-hidden="true" />
      </button>
      {open ? (
        <SettingsDialog
          id={dialogId}
          onClose={() => {
            setOpen(false);
            buttonRef.current?.focus();
          }}
        />
      ) : null}
    </>
  );
}

function SettingsDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = `${id}-title`;

  useEffect(() => {
    dialogRef.current?.focus();
    // The page behind a modal should not scroll under the reader's finger.
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Radios in one group are a single tab stop: count only the checked one.
    const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (element) => !(element instanceof HTMLInputElement && element.type === "radio" && !element.checked),
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <>
      {/* Close on click, not pointerdown: the mousedown that follows a
          pointerdown would land on the page and blur the refocused gear. */}
      <div className="ph-settings-scrim" aria-hidden="true" onClick={onClose} />
      <div
        ref={dialogRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="ph-settings-dialog surface-panel text-left"
      >
        <div className="ph-settings-head">
          <h2 id={titleId} className="text-base font-semibold text-white">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="ph-settings-action ph-settings-close"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <SettingsPanel />
      </div>
    </>,
    document.body,
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
  const colorway = useColorway();
  const motion = useMotionChoice();
  const pinoutTab = usePinoutTab();
  const favorites = useFavorites();
  const library = usePersonalLibrary();
  const [status, setStatus] = useState("");
  const ids = useId();
  const appearanceId = `${ids}-appearance`;
  const behaviorId = `${ids}-behavior`;
  const savedHeadingId = `${ids}-saved`;

  const favoriteCount = favorites.size;
  const recentCount = library.recentBoardIds.length;
  const collectionCount = library.collections.length;
  const nothingSaved = favoriteCount === 0 && recentCount === 0 && collectionCount === 0;
  const allDefaults =
    theme === "system" && colorway === defaultColorway && motion === "system" && pinoutTab === "dynamic";

  return (
    <div className="ph-settings-body">
      <section aria-labelledby={appearanceId} className="grid min-w-0 gap-4">
        <h3 id={appearanceId} className="ph-settings-section-title">
          Appearance
        </h3>
        <ColorwayPicker
          value={colorway}
          onChange={(next) => {
            setColorway(next);
            setStatus("");
          }}
        />
        <Segment
          legend="Light or dark"
          hint="Every colorway has both. System follows your device."
          options={themeOptions}
          value={theme}
          onChange={(next) => {
            setThemeChoice(next);
            setStatus("");
          }}
        />
      </section>

      <div className="ph-settings-columns">
        <section aria-labelledby={behaviorId} className="ph-settings-rule grid min-w-0 content-start gap-4 pt-4">
          <h3 id={behaviorId} className="ph-settings-section-title">
            Behavior
          </h3>
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
        </section>

        <section aria-labelledby={savedHeadingId} className="ph-settings-rule grid min-w-0 content-start gap-2 pt-4">
          <h3 id={savedHeadingId} className="ph-settings-section-title">
            Saved in this browser
          </h3>
          <DataRow label="Favorites" detail={plural(favoriteCount, "board", "boards")}>
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
            disabled={nothingSaved && allDefaults}
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
    </div>
  );
}

/**
 * Colorways as a radio group of preview tiles. Each tile draws a strip of
 * header pads in that colorway's own colors (pin 1 square, as on a real
 * board), for whichever of light or dark is showing now.
 */
function ColorwayPicker({ value, onChange }: { value: string; onChange: (value: ColorwayInfo["id"]) => void }) {
  const name = useId();
  const shown = useShownTheme();
  return (
    <fieldset className="grid min-w-0 gap-2">
      <legend className="mb-2 text-[13px] font-medium text-zinc-200">Colorway</legend>
      <div className="ph-colorway-grid">
        {colorways.map((colorway) => {
          const swatch = colorway[shown];
          const checked = value === colorway.id;
          return (
            <label key={colorway.id} className="ph-colorway-option">
              <input
                type="radio"
                name={name}
                value={colorway.id}
                checked={checked}
                onChange={() => onChange(colorway.id)}
                className="sr-only"
              />
              <span
                className="ph-colorway-swatch"
                aria-hidden="true"
                style={{ background: swatch.ground, borderColor: swatch.pad }}
              >
                <span className="ph-colorway-board" style={{ background: swatch.panel, borderColor: swatch.pad }}>
                  <span className="ph-colorway-legend" style={{ color: swatch.muted }}>
                    J1
                  </span>
                  <span className="ph-colorway-pads">
                    {Array.from({ length: 6 }, (_, index) => (
                      <span
                        key={index}
                        className={index === 0 ? "ph-colorway-pad ph-colorway-pad-first" : "ph-colorway-pad"}
                        style={{ background: index === 0 ? swatch.accent : swatch.pad }}
                      />
                    ))}
                  </span>
                  <span className="ph-colorway-trace" style={{ background: swatch.accent }} />
                  <span className="ph-colorway-text" style={{ background: swatch.ink }} />
                  <span className="ph-colorway-text ph-colorway-text-short" style={{ background: swatch.muted }} />
                </span>
              </span>
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span className="truncate text-[13px] font-medium text-zinc-100">{colorway.name}</span>
                {checked ? <Check className="ph-colorway-check size-4 shrink-0" aria-hidden="true" /> : null}
              </span>
              <span className="text-xs leading-5 text-zinc-400">{colorway.description}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
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

  // Keep keyboard focus in the dialog as the buttons swap: onto the confirm
  // button when armed, back to the first button afterwards, or to the dialog
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
    else trigger?.closest<HTMLElement>('[role="dialog"]')?.focus();
  }, [armed]);

  const className = wide ? "ph-settings-action w-full justify-center" : "ph-settings-action";
  if (!armed) {
    return (
      <button ref={triggerRef} type="button" disabled={disabled} onClick={() => setArmed(true)} className={className}>
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
        className={className}
      >
        {confirmLabel}
      </button>
      <button type="button" onClick={() => setArmed(false)} className={className}>
        Cancel
      </button>
    </div>
  );
}
