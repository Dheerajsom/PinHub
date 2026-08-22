"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Pin } from "@/lib/boards";
import { roleLabels } from "@/components/board-visual/roles";

export function pinToText(pin: Pin): string {
  const functions = pin.aliases?.length ? ` (${pin.aliases.join(", ")})` : "";
  const note = pin.note ? ` — ${pin.note}` : "";
  return `Pin ${pin.position}: ${pin.label}${functions} [${roleLabels[pin.role]}]${note}`;
}

export function CopyPinButton({ pin }: { pin: Pin }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copyPin() {
    try {
      await navigator.clipboard.writeText(pinToText(pin));
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copyPin}
      aria-label={`Copy pin ${pin.position}, ${pin.label}`}
      title={copied ? "Pin copied" : "Copy this pin"}
      className="touch-target grid size-7 shrink-0 place-items-center rounded text-zinc-600 opacity-70 transition hover:bg-white/[0.06] hover:text-cyan-100 focus-visible:opacity-100 group-hover:opacity-100"
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-300" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}
    </button>
  );
}
