"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import {
  Check,
  Copy,
  Download,
  Minus,
  Plus,
  RotateCcw,
  Route,
  TriangleAlert,
} from "lucide-react";
import type { Board, PinRole } from "@/lib/boards";
import { buildBoardGeometry } from "@/lib/board-visual-geometry";
import {
  normalizePlanRequirements,
  planCapabilities,
  planPins,
  type PlanAssignment,
  type PlanPeripheral,
  type PlanRequirements,
} from "@/lib/pin-planner";
import { planExports } from "@/lib/pin-plan-export";
import { planFromSearch, searchWithPlan } from "@/lib/plan-params";
import { BoardStage } from "@/components/board-visual/BoardStage";
import { roleColors } from "@/components/board-visual/roles";

const peripheralRole: Record<PlanPeripheral, PinRole> = {
  I2C: "i2c",
  SPI: "spi",
  UART: "uart",
  CAN: "special",
  PWM: "pwm",
  ADC: "adc",
  DAC: "dac",
  GPIO: "gpio",
};

const peripheralHint: Record<PlanPeripheral, string> = {
  I2C: "SDA, SCL",
  SPI: "SCK, MOSI, MISO, CS",
  UART: "TX, RX",
  CAN: "TX, RX",
  PWM: "1 output each",
  ADC: "1 channel each",
  DAC: "1 channel each",
  GPIO: "plain I/O",
};

/** Tallest the planner's drawing gets; tall boards shrink to fit, not scroll. */
const maxDrawingHeight = 520;

const noNet = new Set<string>();

function today(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The pin planner for a board with source-backed pin functions: say what the
 * circuit needs, get a conflict-free set of pins, see them on the board, and
 * export them as code. State lives in `?plan=` so a shared link reproduces it.
 */
export function PinPlanner({ board }: { board: Board }) {
  const headingId = useId();
  const statusId = useId();
  const capabilities = useMemo(() => planCapabilities(board), [board]);
  const limits = useMemo(
    () => new Map(capabilities.map((item) => [item.peripheral, item.max])),
    [capabilities],
  );
  const fit = useCallback(
    (requirements: PlanRequirements): PlanRequirements => {
      const fitted: PlanRequirements = {};
      for (const [peripheral, max] of limits) {
        const count = Math.min(requirements[peripheral] ?? 0, max);
        if (count > 0) fitted[peripheral] = count;
      }
      return normalizePlanRequirements(fitted);
    },
    [limits],
  );

  const [requirements, setRequirements] = useState<PlanRequirements>({});
  const ready = useRef(false);

  // Restore a shared plan after hydration: the page is statically generated,
  // so the URL is only known in the browser.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (ready.current) return;
      ready.current = true;
      setRequirements(fit(planFromSearch(location.search)));
    });
    return () => cancelAnimationFrame(frame);
  }, [fit]);

  useEffect(() => {
    if (!ready.current) return;
    const next = `${location.pathname}${searchWithPlan(location.search, requirements)}${location.hash}`;
    if (next !== `${location.pathname}${location.search}${location.hash}`) {
      history.replaceState(null, "", next);
    }
  }, [requirements]);

  const update = useCallback(
    (peripheral: PlanPeripheral, delta: number) => {
      const apply = (current: PlanRequirements) =>
        fit({ ...current, [peripheral]: Math.max(0, (current[peripheral] ?? 0) + delta) });
      if (!ready.current) {
        // A tap can beat the first frame; start from the shared plan, not over it.
        ready.current = true;
        setRequirements(apply(fit(planFromSearch(location.search))));
      } else {
        setRequirements(apply);
      }
    },
    [fit],
  );
  const clear = useCallback(() => {
    ready.current = true;
    setRequirements({});
  }, []);

  const result = useMemo(() => planPins(board, requirements), [board, requirements]);
  const assignments = useMemo(
    () => (result.status === "ok" ? result.assignments : []),
    [result],
  );
  const geometry = useMemo(() => buildBoardGeometry(board), [board]);
  const anchorKeyByPin = useMemo(
    () => new Map(geometry?.anchors.map((anchor) => [anchor.pin, anchor.key]) ?? []),
    [geometry],
  );
  const planned = useMemo(() => {
    const map = new Map<string, PinRole>();
    for (const item of assignments) {
      const key = anchorKeyByPin.get(item.pin);
      if (key) map.set(key, peripheralRole[item.peripheral]);
    }
    return map;
  }, [anchorKeyByPin, assignments]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const drawingRef = useRef<HTMLDivElement>(null);
  const liveKey = activeKey ?? selectedKey;
  const liveAnchor = geometry?.anchors.find((anchor) => anchor.key === liveKey) ?? null;
  const liveAssignment = liveAnchor
    ? assignments.find((item) => item.pin === liveAnchor.pin)
    : undefined;

  function probe(item: PlanAssignment) {
    const key = anchorKeyByPin.get(item.pin) ?? null;
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
  const total = Object.values(requirements).reduce((sum, count) => sum + (count ?? 0), 0);

  return (
    <div className="@container min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id={headingId} className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-white">
            <Route className="size-4 text-zinc-400" aria-hidden="true" />
            Plan pins
          </h2>
          <p className="mt-1 max-w-2xl text-[13px] leading-6 text-zinc-400">
            Choose what the circuit needs. PinHub assigns pins from {board.name}&apos;s source-backed
            pin functions only, and flags every pin a source warns about.
          </p>
        </div>
        {total ? (
          <button
            type="button"
            onClick={clear}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 text-xs font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            <span className="text-xs">Clear plan</span>
          </button>
        ) : null}
      </div>

      <div
        role="group"
        aria-labelledby={headingId}
        aria-describedby={statusId}
        className="mt-4 grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,13rem),1fr))]"
      >
        {capabilities.map(({ peripheral, max }) => {
          const count = requirements[peripheral] ?? 0;
          const colors = roleColors[peripheralRole[peripheral]];
          return (
            <div
              key={peripheral}
              role="group"
              aria-label={`${peripheral}, ${count} planned, up to ${max}`}
              className="surface-well flex min-w-0 items-center justify-between gap-2 rounded-lg py-1 pl-3 pr-1"
            >
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5 font-mono text-[13px] font-semibold text-zinc-100">
                  <span className="size-2 shrink-0 self-center rounded-full" style={{ backgroundColor: colors.edge }} aria-hidden="true" />
                  {peripheral}
                  <span className="text-[10px] font-normal text-zinc-500">max {max}</span>
                </div>
                <div className="text-[10px] leading-4 text-zinc-500">{peripheralHint[peripheral]}</div>
              </div>
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => update(peripheral, -1)}
                  disabled={count === 0}
                  aria-label={`Remove one ${peripheral}`}
                  className="ph-plan-step grid size-11 place-items-center rounded-md text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Minus className="size-4" aria-hidden="true" />
                </button>
                <span
                  aria-hidden="true"
                  data-plan-count={peripheral}
                  className="w-6 text-center font-mono text-base font-semibold tabular-nums text-white"
                >
                  {count}
                </span>
                <button
                  type="button"
                  onClick={() => update(peripheral, 1)}
                  disabled={count >= max}
                  aria-label={`Add one ${peripheral}`}
                  className="ph-plan-step grid size-11 place-items-center rounded-md text-zinc-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Plus className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p
        id={statusId}
        data-plan-status=""
        role="status"
        aria-live="polite"
        className={clsx(
          "mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-[13px] leading-6",
          result.status === "unsatisfiable"
            ? "border border-orange-300/30 bg-orange-400/10 text-orange-100"
            : "surface-well text-zinc-300",
        )}
      >
        {result.status === "unsatisfiable" ? (
          <TriangleAlert className="mt-1 size-3.5 shrink-0 text-orange-200" aria-hidden="true" />
        ) : null}
        <span className="min-w-0">{status}</span>
      </p>

      {result.status === "ok" ? (
        <>
          {result.usedFlaggedPins ? (
            <p className="mt-2 text-[12px] leading-5 text-orange-200">
              Every unflagged pin that could carry these signals is taken, so the plan uses the
              flagged pins marked below. Read each caution before wiring.
            </p>
          ) : null}

          <div className="mt-4 grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            {geometry ? (
              <div ref={drawingRef} className="min-w-0 scroll-mt-24 @3xl:sticky @3xl:top-24 @3xl:self-start">
                {/* The whole board stays in view: tall boards shrink to the
                    height cap instead of hiding planned pins below a scroll. */}
                <div className="bv-stage-wrap w-full overflow-hidden rounded-md">
                  <div
                    className="mx-auto"
                    style={{
                      aspectRatio: `${geometry.vbw} / ${geometry.vbh}`,
                      width: `min(100%, ${Math.round((maxDrawingHeight * geometry.vbw) / geometry.vbh)}px)`,
                    }}
                  >
                    <BoardStage
                      geometry={geometry}
                      title={`${board.name} pin plan`}
                      sheetLabel={board.name}
                      selectedKey={selectedKey}
                      activeKey={liveKey}
                      activeRole={null}
                      showAllLabels={false}
                      netKeys={noNet}
                      planned={planned}
                      onSelect={(key) => {
                        setSelectedKey(key);
                        setActiveKey(key);
                      }}
                      onActiveKey={setActiveKey}
                    />
                  </div>
                </div>
                <p className="mt-2 min-h-5 font-mono text-[11px] leading-5 text-zinc-400" aria-live="polite">
                  {liveAnchor
                    ? `${liveAnchor.group ? `${liveAnchor.group} · ` : ""}${liveAnchor.pin.position} · ${liveAnchor.pin.label}${
                        liveAssignment
                          ? ` · ${liveAssignment.peripheral} ${liveAssignment.unit}${liveAssignment.instance ? ` ${liveAssignment.instance}` : ""}${liveAssignment.signal !== "IO" ? ` ${liveAssignment.signal}` : ""}`
                          : " · not in this plan"
                      }`
                    : "Dashed rings mark planned pins. Choose a row to probe its pin."}
                </p>
              </div>
            ) : null}

            <PlanTable
              assignments={assignments}
              selectedPin={liveAnchor?.pin ?? null}
              onProbe={probe}
            />
          </div>

          <PlanNotes board={board} muxNote={result.muxNote} matrix={result.muxModel === "matrix"} />
          <PlanExports board={board} assignments={assignments} />
        </>
      ) : null}
    </div>
  );
}

function PlanTable({
  assignments,
  selectedPin,
  onProbe,
}: {
  assignments: PlanAssignment[];
  selectedPin: PlanAssignment["pin"] | null;
  onProbe: (item: PlanAssignment) => void;
}) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full border-collapse text-left font-mono text-[12px]">
        <caption className="sr-only">Planned pins</caption>
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">
            <th scope="col" className="px-2 pb-2 font-medium">Function</th>
            <th scope="col" className="px-2 pb-2 font-medium">Signal</th>
            <th scope="col" className="px-2 pb-2 font-medium">Pin</th>
            <th scope="col" className="px-2 pb-2 font-medium">Label</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((item) => {
            const selected = selectedPin === item.pin;
            const colors = roleColors[peripheralRole[item.peripheral]];
            const place = item.group ? `${item.group} · ${item.pin.position}` : String(item.pin.position);
            const key = `${item.peripheral}-${item.unit}-${item.signal}-${item.pin.label}`;
            return [
              <tr
                key={key}
                data-selected={selected || undefined}
                className={clsx(
                  "border-t border-white/10 align-middle transition",
                  selected ? "bg-white/[0.06]" : "",
                )}
              >
                <td className="px-2 py-1 text-zinc-300">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: colors.edge }} aria-hidden="true" />
                    {item.peripheral} {item.unit}
                  </span>
                </td>
                <td className="px-2 py-1 whitespace-nowrap text-zinc-200">
                  {[item.instance, item.signal !== "IO" ? item.signal : null].filter(Boolean).join(" ") || "I/O"}
                </td>
                <td className="px-2 py-1 whitespace-nowrap text-zinc-400">{place}</td>
                <td className="px-2 py-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onProbe(item)}
                      aria-pressed={selected}
                      aria-label={`Show pin ${item.pin.position}, ${item.pin.label} on the board`}
                      className={clsx(
                        "inline-flex min-h-11 items-center rounded px-1.5 text-left font-semibold underline-offset-4 transition hover:underline",
                        selected ? "text-white" : "text-zinc-100",
                      )}
                    >
                      <span className="font-mono text-[12px]">{item.pin.label}</span>
                    </button>
                    {item.isDefault ? (
                      <span className="rounded border border-white/10 px-1 py-0.5 text-[10px] text-zinc-400">default</span>
                    ) : null}
                    {item.routed ? (
                      <span className="rounded border border-white/10 px-1 py-0.5 text-[10px] text-zinc-400">routed</span>
                    ) : null}
                  </span>
                </td>
              </tr>,
              item.cautions.length ? (
                <tr key={`${key}-caution`} className="align-top">
                  <td colSpan={4} className="px-2 pb-2">
                    <ul className="space-y-1 rounded-md border border-orange-300/30 bg-orange-400/10 px-2 py-1.5 font-sans text-[12px] leading-5 text-orange-100">
                      {item.cautions.map((caution) => (
                        <li key={caution.flag} className="flex gap-1.5">
                          <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-orange-200" aria-hidden="true" />
                          <span className="min-w-0">
                            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-orange-200">
                              {caution.flag.replaceAll("-", " ")}
                            </span>{" "}
                            {caution.note}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ) : null,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}

function PlanNotes({ board, muxNote, matrix }: { board: Board; muxNote: string; matrix: boolean }) {
  const sources = board.pinFunctions?.sources ?? [];
  return (
    <div className="mt-4 space-y-2 border-t border-white/10 pt-3 text-[12px] leading-5 text-zinc-400">
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

function PlanExports({ board, assignments }: { board: Board; assignments: PlanAssignment[] }) {
  const exports = useMemo(() => planExports(board, assignments, today()), [board, assignments]);
  const [format, setFormat] = useState(exports[0]?.format);
  const [feedback, setFeedback] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const labelId = useId();
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const current = exports.find((item) => item.format === format) ?? exports[0];
  if (!current) return null;

  async function copy() {
    if (timer.current) clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(current.text);
      setFeedback(`Copied the ${current.label} export.`);
    } catch {
      setFeedback("Couldn’t copy. Check clipboard permission and try again.");
    }
    timer.current = setTimeout(() => setFeedback(""), 3000);
  }

  return (
    <section aria-labelledby={labelId} className="mt-4 border-t border-white/10 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={labelId} className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Export
        </h3>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Export format">
          {exports.map((item) => (
            <button
              key={item.format}
              type="button"
              aria-pressed={item.format === current.format}
              onClick={() => setFormat(item.format)}
              className={clsx(
                "min-h-11 rounded-md border px-3 text-[12px] font-medium transition",
                item.format === current.format
                  ? "border-cyan-300/60 bg-cyan-300/10 text-cyan-50"
                  : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/25 hover:text-white",
              )}
            >
              <span className="text-[12px]">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 break-all font-mono text-[11px] text-zinc-500">{current.filename}</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={copy}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 text-[12px] font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            {feedback.startsWith("Copied") ? (
              <Check className="size-3.5 text-emerald-300" aria-hidden="true" />
            ) : (
              <Copy className="size-3.5" aria-hidden="true" />
            )}
            <span className="text-[12px]">Copy</span>
          </button>
          <a
            href={`data:${current.mimeType};charset=utf-8,${encodeURIComponent(current.text)}`}
            download={current.filename}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 text-[12px] font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
          >
            <Download className="size-3.5" aria-hidden="true" />
            Download
          </a>
        </div>
      </div>
      <pre
        tabIndex={0}
        aria-label={`${current.label} export preview`}
        className="surface-well mt-2 max-h-72 overflow-auto rounded-md p-3 font-mono text-[11px] leading-5 text-zinc-300"
      >
        <code>{current.text}</code>
      </pre>
      <p role="status" aria-live="polite" className={feedback ? "mt-1 text-[12px] text-zinc-400" : "sr-only"}>
        {feedback}
      </p>
    </section>
  );
}
