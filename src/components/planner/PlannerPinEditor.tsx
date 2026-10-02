"use client";

import { useId, useState } from "react";
import { TriangleAlert, X } from "lucide-react";
import type { PinAnchor } from "@/lib/board-visual-geometry";
import type { PlanAssignment } from "@/lib/pin-planner";
import {
  claimNameInput,
  cleanClaimName,
  maxClaimNameLength,
  maxClaims,
  type ClaimCaution,
} from "@/lib/planner-claims";
import { roleLabels } from "@/components/board-visual/roles";

type Props = {
  anchor: PinAnchor;
  /** The pin's current claim name, or null when it is not claimed. */
  claimedName: string | null;
  assignment?: PlanAssignment;
  cautions: ClaimCaution[];
  /** False when the claim limit is reached and this pin is not yet claimed. */
  canClaim: boolean;
  onClaim: (name: string) => void;
  onRelease: () => void;
  onClose: () => void;
};

/** Claim, rename, or release the selected pin. Mount with `key={anchor.key}`. */
export function PlannerPinEditor({
  anchor,
  claimedName,
  assignment,
  cautions,
  canClaim,
  onClaim,
  onRelease,
  onClose,
}: Props) {
  const inputId = useId();
  const [name, setName] = useState(claimedName ?? "");
  const claimed = claimedName !== null;
  const { pin } = anchor;

  return (
    <section aria-label="Pin editor" className="surface-well ph-plan-editor mt-3 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 font-mono text-[12px] leading-5 text-zinc-200">
          {anchor.group ? `${anchor.group} · ` : ""}
          {pin.position} · <span className="font-semibold text-white">{pin.label}</span>
          <span className="text-zinc-500"> · {roleLabels[pin.role]}</span>
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close pin editor"
          className="ph-plan-step -mr-1 -mt-1 grid size-11 shrink-0 place-items-center rounded-md text-zinc-400 transition hover:text-white"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {pin.note && pin.role !== "reserved" ? (
        <p className="mt-1 text-[12px] leading-5 text-zinc-400">{pin.note}</p>
      ) : null}
      {cautions.length ? (
        <ul className="mt-2 space-y-1 rounded-md border border-orange-300/30 bg-orange-400/10 px-2 py-1.5 text-[12px] leading-5 text-orange-100">
          {cautions.map((caution) => (
            <li key={caution.label} className="flex gap-1.5">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-orange-200" aria-hidden="true" />
              <span className="min-w-0">
                <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-orange-200">
                  {caution.label}
                </span>{" "}
                {caution.note}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {assignment && !claimed ? (
        <p className="mt-2 text-[12px] leading-5 text-zinc-400">
          Auto-assigned to {assignment.peripheral} {assignment.unit}. Claiming it moves that function
          to another pin.
        </p>
      ) : null}

      <form
        className="mt-3 flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (claimed || canClaim) onClaim(cleanClaimName(name));
        }}
      >
        <div className="min-w-0 flex-1 basis-40">
          <label
            htmlFor={inputId}
            className="block font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500"
          >
            Used for
          </label>
          <input
            id={inputId}
            value={name}
            maxLength={maxClaimNameLength}
            autoComplete="off"
            spellCheck={false}
            placeholder="e.g. OLED SDA"
            onChange={(event) => setName(claimNameInput(event.target.value))}
            className="mt-1 h-11 w-full rounded-md border border-white/10 bg-[#0a0c11] px-3 font-mono text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-300/70 focus:ring-1 focus:ring-cyan-300/30"
          />
        </div>
        <button
          type="submit"
          disabled={!claimed && !canClaim}
          className="inline-flex min-h-11 items-center rounded-md border border-cyan-300/60 bg-cyan-300/10 px-3 text-cyan-50 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <span className="text-[12px] font-medium">{claimed ? "Update name" : "Claim pin"}</span>
        </button>
        {claimed ? (
          <button
            type="button"
            onClick={onRelease}
            className="inline-flex min-h-11 items-center rounded-md border border-white/10 bg-white/[0.03] px-3 text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            <span className="text-[12px] font-medium">Release pin</span>
          </button>
        ) : null}
      </form>
      {!claimed && !canClaim ? (
        <p role="status" className="mt-2 text-[12px] leading-5 text-zinc-400">
          A plan holds at most {maxClaims} claimed pins. Release one to claim this pin.
        </p>
      ) : null}
    </section>
  );
}
