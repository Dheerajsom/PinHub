"use client";

import { Check, Copy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Pin } from "@/lib/boards";
import { roleLabels } from "@/components/board-visual/roles";
import { pinCautionTexts, type PinFlagNotes } from "@/lib/pin-reference";

export function pinToText(pin: Pin, flagNotes?: PinFlagNotes): string {
  const functions = pin.aliases?.length ? ` (${pin.aliases.join(", ")})` : "";
  const cautions = pinCautionTexts(pin, flagNotes);
  const note = cautions.length ? ` — ${cautions.join(" · ")}` : "";
  return `Pin ${pin.position}: ${pin.label}${functions} [${roleLabels[pin.role]}]${note}`;
}

type CopyState = "idle" | "copied" | "failed";

export function CopyPinButton({
  pin,
  withLabel = false,
  flagNotes,
}: {
  pin: Pin;
  /** Show a "Copy" text label beside the icon (the pin readout's action row). */
  withLabel?: boolean;
  flagNotes?: PinFlagNotes;
}) {
  const text = pinToText(pin, flagNotes);
  const [result, setResult] = useState<{ text: string; state: CopyState }>({ text, state: "idle" });
  const state = result.text === text ? result.state : "idle";
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef(0);

  // The readout reuses this button as the selected pin changes; a result for
  // the previous pin must not describe the new one.
  useEffect(
    () => () => {
      request.current += 1;
      if (timer.current) clearTimeout(timer.current);
    },
    [text],
  );

  async function copyPin() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const generation = ++request.current;
    setResult({ text, state: "idle" });
    try {
      await navigator.clipboard.writeText(text);
      if (generation !== request.current) return;
      setResult({ text, state: "copied" });
      timer.current = setTimeout(() => {
        if (generation === request.current) setResult({ text, state: "idle" });
      }, 1600);
    } catch {
      // A failure stays visible until the next attempt: it tells the user the
      // clipboard may still hold something else.
      if (generation === request.current) setResult({ text, state: "failed" });
    }
  }

  const announcement =
    state === "copied"
      ? `Copied pin ${pin.position}, ${pin.label}.`
      : state === "failed"
        ? `Couldn’t copy pin ${pin.position}. Check clipboard permission and try again, or select the pin text.`
        : "";

  return (
    <>
      <button
        type="button"
        onClick={copyPin}
        aria-label={`Copy pin ${pin.position}, ${pin.label}`}
        title={
          state === "copied"
            ? "Pin copied"
            : state === "failed"
              ? "Copy failed. Try again or select the pin text."
              : "Copy this pin"
        }
        data-copy-state={state}
        className={
          withLabel
            ? "pin-action"
            : "touch-target grid size-7 shrink-0 place-items-center rounded text-zinc-600 opacity-70 transition hover:bg-white/[0.06] hover:text-cyan-100 focus-visible:opacity-100 group-hover:opacity-100 data-[copy-state=failed]:text-zinc-300 data-[copy-state=failed]:opacity-100"
        }
      >
        {state === "copied" ? (
          <Check className="size-3.5 text-emerald-300" aria-hidden="true" />
        ) : state === "failed" ? (
          <X className="size-3.5" aria-hidden="true" />
        ) : (
          <Copy className="size-3.5" aria-hidden="true" />
        )}
        {withLabel
          ? state === "copied"
            ? "Copied"
            : state === "failed"
              ? "Copy failed"
              : "Copy"
          : null}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </>
  );
}
