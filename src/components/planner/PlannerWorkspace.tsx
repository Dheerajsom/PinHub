"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import type { Board, Pin, PinRole } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import {
  maxPlanCount,
  normalizePlanRequirements,
  planCapabilities,
  planPins,
  type PlanPeripheral,
  type PlanRequirements,
  type PlanResult,
} from "@/lib/pin-planner";
import { planExports } from "@/lib/pin-plan-export";
import { claimsFromSearch, planFromSearch, searchWithPlanner } from "@/lib/plan-params";
import { pinReportContextFor, pinReportUrl } from "@/lib/pin-report";
import {
  claimCautions,
  cleanClaimName,
  maxClaims,
  type ClaimedPin,
  type PinClaim,
} from "@/lib/planner-claims";
import { BoardStage } from "@/components/board-visual/BoardStage";
import { VendorLogo } from "@/components/VendorLogo";
import { PlannerAutoAssign } from "@/components/planner/PlannerAutoAssign";
import { PlannerExports } from "@/components/planner/PlannerExports";
import { PlannerPinEditor } from "@/components/planner/PlannerPinEditor";
import { PlannerPinsTable, type PlannerRow } from "@/components/planner/PlannerPinsTable";
import { peripheralRole } from "@/components/planner/peripherals";

/**
 * Tallest the planner's drawing gets: the room the window has, and never less
 * than this floor. Tall connectors shrink to fit rather than scroll, so every
 * planned pad stays in view.
 */
const minDrawingHeight = 560;
const noNet = new Set<string>();
const unsupported: PlanResult = { status: "unsupported" };

function today(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The planner for one board. Pins are claimed by hand on the drawing; on a
 * board with source-backed pin functions the solver fits further peripherals
 * into whatever is left. Both halves live in the URL (`use=` and `plan=`).
 * Mount with `key={board.id}` so a new board starts clean.
 */
export function PlannerWorkspace({ board, onChangeBoard }: { board: Board; onChangeBoard: () => void }) {
  const auto = Boolean(board.pinFunctions && board.pinout);
  // The planner draws its own sheet: the connector, not a picture of the board.
  const geometry = useMemo(() => buildBoardGeometry(board, { sheet: true }), [board]);
  const anchorByKey = useMemo(
    () => new Map(geometry?.anchors.map((anchor) => [anchor.key, anchor]) ?? []),
    [geometry],
  );
  const validKeys = useMemo(() => new Set(anchorByKey.keys()), [anchorByKey]);
  const baseLimits = useMemo(
    () => new Map(planCapabilities(board).map((item) => [item.peripheral, item.max])),
    [board],
  );
  const fit = useCallback(
    (requirements: PlanRequirements): PlanRequirements => {
      const fitted: PlanRequirements = {};
      for (const [peripheral, max] of baseLimits) {
        const count = Math.min(requirements[peripheral] ?? 0, max);
        if (count > 0) fitted[peripheral] = count;
      }
      return normalizePlanRequirements(fitted);
    },
    [baseLimits],
  );

  const [requirements, setRequirements] = useState<PlanRequirements>({});
  const [claims, setClaims] = useState<PinClaim[]>([]);
  const ready = useRef(false);

  const restore = useCallback(() => {
    if (ready.current) return;
    ready.current = true;
    setRequirements(fit(planFromSearch(location.search)));
    setClaims(claimsFromSearch(location.search, validKeys));
  }, [fit, validKeys]);

  // Restore a shared plan after hydration: the page is statically generated,
  // so the URL is only known in the browser.
  useEffect(() => {
    const frame = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(frame);
  }, [restore]);

  useEffect(() => {
    if (!ready.current) return;
    const next = `${location.pathname}${searchWithPlanner(location.search, requirements, claims)}${location.hash}`;
    if (next !== `${location.pathname}${location.search}${location.hash}`) {
      history.replaceState(null, "", next);
    }
  }, [requirements, claims]);

  const claimNameByKey = useMemo(
    () => new Map(claims.map((claim) => [claim.key, claim.name])),
    [claims],
  );
  const claimedKeys = useMemo(() => new Set(claimNameByKey.keys()), [claimNameByKey]);
  const excluded = useMemo(() => {
    const pins = new Set<Pin>();
    for (const key of claimedKeys) {
      const anchor = anchorByKey.get(key);
      if (anchor) pins.add(anchor.pin);
    }
    return pins;
  }, [anchorByKey, claimedKeys]);

  const capabilities = useMemo(
    () => (auto ? planCapabilities(board, excluded) : []),
    [auto, board, excluded],
  );
  const result = useMemo(
    () => (auto ? planPins(board, requirements, undefined, excluded) : unsupported),
    [auto, board, excluded, requirements],
  );
  const assignments = useMemo(() => (result.status === "ok" ? result.assignments : []), [result]);
  const assignmentByPin = useMemo(
    () => new Map(assignments.map((item) => [item.pin, item])),
    [assignments],
  );

  const planned = useMemo(() => {
    const map = new Map<string, PinRole>();
    for (const anchor of geometry?.anchors ?? []) {
      const item = assignmentByPin.get(anchor.pin);
      if (item) map.set(anchor.key, peripheralRole[item.peripheral]);
    }
    return map;
  }, [assignmentByPin, geometry]);

  const rows = useMemo<PlannerRow[]>(() => {
    const list: PlannerRow[] = [];
    for (const anchor of geometry?.anchors ?? []) {
      const name = claimNameByKey.get(anchor.key);
      const assignment = assignmentByPin.get(anchor.pin);
      if (name !== undefined) {
        list.push({ kind: "manual", anchor, name, cautions: claimCautions(board, anchor.pin) });
      } else if (assignment) {
        list.push({
          kind: "auto",
          anchor,
          assignment,
          cautions: assignment.cautions.map((item) => ({
            label: item.flag.replaceAll("-", " "),
            note: item.note,
          })),
        });
      }
    }
    return list;
  }, [assignmentByPin, board, claimNameByKey, geometry]);

  const claimedPins = useMemo<ClaimedPin[]>(
    () =>
      rows.flatMap((row) =>
        row.kind === "manual"
          ? [
              {
                name: row.name,
                pin: row.anchor.pin,
                ...(row.anchor.group ? { group: row.anchor.group } : {}),
                cautions: row.cautions,
              },
            ]
          : [],
      ),
    [rows],
  );
  const exports = useMemo(
    () => planExports(board, assignments, today(), claimedPins),
    [assignments, board, claimedPins],
  );

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const drawingRef = useRef<HTMLDivElement>(null);
  const liveKey = activeKey ?? selectedKey;
  const liveAnchor = liveKey ? anchorByKey.get(liveKey) ?? null : null;
  const selectedAnchor = selectedKey ? anchorByKey.get(selectedKey) ?? null : null;

  const step = useCallback(
    (peripheral: PlanPeripheral, delta: number) => {
      const apply = (current: PlanRequirements) =>
        normalizePlanRequirements({
          ...current,
          [peripheral]: Math.min(maxPlanCount, Math.max(0, (current[peripheral] ?? 0) + delta)),
        });
      if (!ready.current) {
        // A tap can beat the first frame; start from the shared plan, not over it.
        ready.current = true;
        setClaims(claimsFromSearch(location.search, validKeys));
        setRequirements(apply(fit(planFromSearch(location.search))));
      } else {
        setRequirements(apply);
      }
    },
    [fit, validKeys],
  );

  function claim(key: string, name: string) {
    restore();
    const cleaned = cleanClaimName(name);
    setClaims((current) => {
      if (current.some((item) => item.key === key)) {
        return current.map((item) => (item.key === key ? { key, name: cleaned } : item));
      }
      return current.length >= maxClaims ? current : [...current, { key, name: cleaned }];
    });
  }

  function release(key: string) {
    restore();
    setClaims((current) => current.filter((item) => item.key !== key));
  }

  function closeEditor() {
    setSelectedKey(null);
    setActiveKey(null);
  }

  function probe(key: string) {
    setSelectedKey((current) => (current === key ? null : key));
    setActiveKey(null);
    drawingRef.current?.scrollIntoView({
      block: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  const cautionCount = assignments.filter((item) => item.cautions.length).length;
  const status =
    result.status === "ok"
      ? `Plan ready: ${assignments.length} ${assignments.length === 1 ? "pin" : "pins"} assigned${cautionCount ? `, ${cautionCount} with ${cautionCount === 1 ? "a caution" : "cautions"}` : ""}.`
      : result.status === "unsatisfiable"
        ? `No plan fits. ${result.reason}`
        : "Add the peripherals your circuit needs to plan its pins.";
  const hasPlan = claims.length > 0 || Object.keys(requirements).length > 0;
  const liveName = liveAnchor ? claimNameByKey.get(liveAnchor.key) : undefined;
  const liveAssignment = liveAnchor ? assignmentByPin.get(liveAnchor.pin) : undefined;

  return (
    <section aria-label="Pin planner" className="@container min-w-0">
      <header className="surface-panel flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-2xl p-4 sm:p-5">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-cyan-200">Pin planner</p>
          <h1 className="mt-1.5 flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-white">
            <VendorLogo vendor={board.vendor} size={24} />
            <span className="min-w-0 break-words">{board.name}</span>
          </h1>
          <p className="mt-1 font-mono text-[11px] leading-5 text-zinc-500">
            {board.logicLevel} · {claims.length} claimed · {assignments.length} auto-assigned
          </p>
          <p className="flex flex-wrap gap-x-4 text-[13px]">
            <Link
              href={`/boards/${board.id}`}
              className="inline-flex min-h-11 items-center text-zinc-400 underline-offset-4 transition hover:text-white hover:underline"
            >
              Board overview
            </Link>
            <Link
              href={`/pinout/${board.id}`}
              className="inline-flex min-h-11 items-center text-zinc-400 underline-offset-4 transition hover:text-white hover:underline"
            >
              Full pin map
            </Link>
          </p>
        </div>
        {confirming ? (
          <div role="group" aria-label="Change board" className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] text-zinc-300">Discard this plan?</p>
            <button
              type="button"
              onClick={onChangeBoard}
              className="inline-flex min-h-11 items-center rounded-md border border-orange-300/30 bg-orange-400/10 px-3 text-orange-100 transition"
            >
              <span className="text-[12px] font-medium">Discard plan and change board</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="inline-flex min-h-11 items-center rounded-md border border-white/10 bg-white/[0.03] px-3 text-zinc-300 transition hover:border-white/25 hover:text-white"
            >
              <span className="text-[12px] font-medium">Keep planning</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => (hasPlan ? setConfirming(true) : onChangeBoard())}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            <ArrowLeftRight className="size-3.5" aria-hidden="true" />
            <span className="text-[12px] font-medium">Change board</span>
          </button>
        )}
      </header>

      <div className="mt-4 grid gap-4 @3xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] @3xl:items-start">
        <div
          ref={drawingRef}
          className="surface-panel min-w-0 scroll-mt-24 rounded-xl p-4 @3xl:sticky @3xl:top-4"
        >
          {geometry ? (
            <>
              {/* Two lines are always reserved. Touching a pad swaps the hint
                  for a shorter readout, and a line that collapsed there would
                  move the sheet between touch-down and touch-up, so the tap
                  would land on a different pad. */}
              <p className="mb-2 min-h-10 font-mono text-[11px] leading-5 text-zinc-400" aria-live="polite">
                {liveAnchor
                  ? `${liveAnchor.group ? `${liveAnchor.group} · ` : ""}${liveAnchor.pin.position} · ${liveAnchor.pin.label}${
                      liveName !== undefined
                        ? ` · claimed${liveName ? `: ${liveName}` : ""}`
                        : liveAssignment
                          ? ` · ${liveAssignment.peripheral} ${liveAssignment.unit}${liveAssignment.instance ? ` ${liveAssignment.instance}` : ""}${liveAssignment.signal !== "IO" ? ` ${liveAssignment.signal}` : ""}`
                          : " · free"
                    }`
                  : "Select a pin to claim it. Solid rings are yours; dashed rings are auto-assigned."}
              </p>
              {/* The whole connector stays in view: tall ones shrink to the
                  height cap instead of hiding pins below a scroll. */}
              <div className="bv-stage-wrap w-full overflow-hidden rounded-md">
                <div
                  className="mx-auto"
                  style={{
                    aspectRatio: `${geometry.vbw} / ${geometry.vbh}`,
                    width: `min(100%, calc(max(${minDrawingHeight}px, 100dvh - 11rem) * ${(geometry.vbw / geometry.vbh).toFixed(4)}))`,
                  }}
                >
                  <BoardStage
                    geometry={geometry}
                    title={`${board.name} pin plan`}
                    sheetLabel={board.name}
                    selectedKey={selectedKey}
                    activeKey={liveKey}
                    activeRole={null}
                    showAllLabels
                    netKeys={noNet}
                    planned={planned}
                    claimed={claimedKeys}
                    onSelect={(key) => {
                      setSelectedKey(key);
                      setActiveKey(key);
                    }}
                    onActiveKey={setActiveKey}
                  />
                </div>
              </div>
              {selectedAnchor ? (
                // The editor rides the bottom of the window while the sheet is
                // in view, so it is on screen whichever pad was picked.
                <div className="sticky bottom-3 z-10">
                <PlannerPinEditor
                  key={selectedAnchor.key}
                  anchor={selectedAnchor}
                  claimedName={claimNameByKey.get(selectedAnchor.key) ?? null}
                  assignment={assignmentByPin.get(selectedAnchor.pin)}
                  cautions={claimCautions(board, selectedAnchor.pin)}
                  canClaim={claims.length < maxClaims}
                  // Claiming or releasing finishes with that pin, so the
                  // editor closes and the next pad is one tap away.
                  onClaim={(name) => {
                    claim(selectedAnchor.key, name);
                    closeEditor();
                  }}
                  onRelease={() => {
                    release(selectedAnchor.key);
                    closeEditor();
                  }}
                  onClose={closeEditor}
                />
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-[13px] leading-6 text-zinc-400">
              PinHub has no drawing for this board&apos;s connector yet, so pins cannot be claimed here.
            </p>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <section aria-label="Your pins" className="surface-panel min-w-0 rounded-xl p-4">
            <h2 className="mb-3 text-[15px] font-semibold tracking-tight text-white">Your pins</h2>
            <PlannerPinsTable rows={rows} selectedKey={liveKey} auto={auto} onProbe={probe} />
          </section>
          <PlannerAutoAssign
            available={auto}
            boardName={board.name}
            reportUrl={pinReportUrl(pinReportContextFor(board))}
            capabilities={capabilities}
            requirements={requirements}
            status={status}
            unsatisfiable={result.status === "unsatisfiable"}
            usedFlaggedPins={result.status === "ok" && result.usedFlaggedPins}
            onStep={step}
            onClear={() => {
              restore();
              setRequirements({});
            }}
          />
          {result.status === "ok" ? (
            <PlanNotes board={board} muxNote={result.muxNote} matrix={result.muxModel === "matrix"} />
          ) : null}
          {exports.length ? <PlannerExports exports={exports} /> : null}
        </div>
      </div>
    </section>
  );
}

function PlanNotes({ board, muxNote, matrix }: { board: Board; muxNote: string; matrix: boolean }) {
  const sources = board.pinFunctions?.sources ?? [];
  return (
    <div className="surface-panel space-y-2 rounded-xl p-4 text-[12px] leading-5 text-zinc-400">
      <p>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500">
          {matrix ? "GPIO matrix" : "Fixed pin functions"}
        </span>{" "}
        {muxNote}
      </p>
      <details>
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-zinc-300 transition hover:text-white">
          Pin function sources ({sources.length})
        </summary>
        <ul className="mt-1 space-y-1">
          {sources.map((source) => (
            <li key={source.url} className="min-w-0">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-words underline-offset-2 hover:text-white hover:underline"
              >
                {source.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
