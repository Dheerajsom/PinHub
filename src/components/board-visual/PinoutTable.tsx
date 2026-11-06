"use client";

import { matchesPin } from "@/lib/pin-match";
import { netForPin } from "@/lib/pin-nets";
import { Fragment } from "react";
import { clsx } from "clsx";
import type { PinRole, PinFunctionData } from "@/lib/boards";
import type { PinAnchor } from "@/lib/board-visual-geometry";
import type { PinNet } from "@/lib/pin-nets";
import { roleChipStyle, roleLabels } from "@/components/board-visual/roles";
import { isReferenceGpio, referenceFunctions, pinCautionTexts, type PinFlagNotes } from "@/lib/pin-reference";

/**
 * Categories people actually use when looking for a header signal. These are
 * intentionally broader than PinRole: ADC and DAC are both analog, and boot
 * pins are commonly represented as `system` or `special` with a caution note.
 */
export const pinoutFilterOptions = [
  { id: "gpio", label: "GPIO" },
  { id: "power", label: "Power" },
  { id: "ground", label: "Ground" },
  { id: "analog", label: "Analog" },
  { id: "pwm", label: "PWM" },
  { id: "uart", label: "UART" },
  { id: "i2c", label: "I2C" },
  { id: "spi", label: "SPI" },
  { id: "boot", label: "Boot / strap" },
  { id: "reserved", label: "Reserved" },
] as const;

export type PinoutFilterCategory = (typeof pinoutFilterOptions)[number]["id"];

const bootPinText = /\b(?:boot|strap|strapping|download mode|flash mode)\b/i;
const reservedPinText =
  /\b(?:reserved|no[- ]?connect|not connected|unavailable|flash|psram)\b/i;

export function pinMatchesCategory(
  pin: PinAnchor["pin"],
  category: PinoutFilterCategory,
  functionData?: PinFunctionData,
): boolean {
  const searchable = [
    pin.label,
    ...(pin.aliases ?? []),
    pin.note ?? "",
  ].join(" ");
  const functions = referenceFunctions(pin, functionData);
  const has = (peripheral: string) => matchesPin({
    ...pin, key: "", gpio: isReferenceGpio(pin), net: netForPin(pin)?.label,
    signals: functions.flatMap((item) => [item.peripheral, item.signal, `${item.instance} ${item.signal}`]),
  }, peripheral.toLowerCase());

  switch (category) {
    case "gpio":
      return isReferenceGpio(pin);
    case "power":
      return pin.role === "power";
    case "ground":
      return pin.role === "ground";
    case "analog":
      return has("ADC") || has("DAC");
    case "pwm":
      return has("PWM");
    case "uart":
      return has("UART");
    case "i2c":
      return has("I2C");
    case "spi":
      return has("SPI");
    case "boot":
      return Boolean(pin.flags?.some((flag) => flag === "boot" || flag === "strapping")) || bootPinText.test(searchable);
    case "reserved":
      return pin.role === "reserved" || Boolean(pin.flags?.includes("module-memory")) || reservedPinText.test(searchable);
  }
}

/** Search fields shared by the full-view chips and the filtered table. */
export function pinMatchesQuery(
  anchor: PinAnchor,
  query: string,
  connector = "",
  functionData?: PinFunctionData,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  return [
    String(anchor.pin.position),
    anchor.pin.label,
    anchor.pin.role,
    anchor.group ?? "",
    connector,
    ...(anchor.pin.aliases ?? []),
    anchor.pin.note ?? "",
    ...(anchor.pin.flags ?? []),
    ...referenceFunctions(anchor.pin, functionData).map((item) => `${item.peripheral} ${item.instance} ${item.signal}`),
  ]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export function filterPinAnchors(
  anchors: PinAnchor[],
  {
    query = "",
    categories = [],
    connector = "",
    functionData,
  }: {
    query?: string;
    categories?: readonly PinoutFilterCategory[];
    connector?: string;
    functionData?: PinFunctionData;
  } = {},
): PinAnchor[] {
  return anchors.filter(
    (anchor) =>
      pinMatchesQuery(anchor, query, connector, functionData) &&
      (!categories.length ||
        categories.some((category) => pinMatchesCategory(anchor.pin, category, functionData))),
  );
}

// The pin schedule: the drawing's companion table, and the robust fallback for
// assistive technology and print. Always present in the DOM and synchronized
// with the drawing — the probed pin's row is marked, every row on the probed net
// is marked more quietly, and clicking a row holds it.
export function PinoutTable({
  anchors,
  activeKey,
  selectedKey,
  activeRole,
  netKeys,
  netByKey,
  onSelect,
  onActiveKey,
  flagNotes,
}: {
  anchors: PinAnchor[];
  activeKey: string | null;
  selectedKey: string | null;
  activeRole: PinRole | null;
  netKeys: Set<string>;
  netByKey: Map<string, PinNet | null>;
  onSelect: (key: string | null) => void;
  onActiveKey: (key: string | null) => void;
  flagNotes?: PinFlagNotes;
}) {
  return (
    <table className="w-full table-fixed border-collapse text-left text-sm">
      <caption className="sr-only">
        Full pin list, synchronized with the board drawing.
      </caption>
      <thead>
        <tr className="border-b border-white/10">
          <th scope="col" className="w-8 py-1.5 pr-1.5 text-left text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            #
          </th>
          <th scope="col" className="w-[30%] py-1.5 pr-2 text-left text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            Signal
          </th>
          <th scope="col" className="w-[4.75rem] py-1.5 pr-2 text-left text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            Role
          </th>
          {/* On a phone-width container the Net column would starve the notes
              column into single-character wraps; the probed net still reads
              out through the pin details and the ring highlight, so the
              column yields below 26rem. */}
          <th scope="col" className="w-[4.25rem] py-1.5 pr-2 text-left text-[10px] uppercase tracking-[0.14em] text-zinc-500 @max-[26rem]:hidden">
            Net
          </th>
          <th scope="col" className="py-1.5 pr-1 text-left text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            Also / notes
          </th>
        </tr>
      </thead>
      <tbody>
        {anchors.map((anchor, index) => {
          const showGroupHeader =
            Boolean(anchor.group) &&
            anchor.group !== anchors[index - 1]?.group;
          const isActive = anchor.key === activeKey;
          const isSelected = anchor.key === selectedKey;
          const onNet = netKeys.has(anchor.key) && !isActive;
          const dimmed =
            activeRole !== null && anchor.pin.role !== activeRole;
          const net = netByKey.get(anchor.key) ?? null;
          const toggleSelection = () =>
            onSelect(isSelected ? null : anchor.key);

          return (
            <Fragment key={anchor.key}>
              {showGroupHeader ? (
                <tr>
                  <th
                    colSpan={5}
                    className="border-t border-white/10 pb-1.5 pt-5 text-left text-[10px] uppercase tracking-[0.14em] text-zinc-400"
                  >
                    {anchor.group}
                  </th>
                </tr>
              ) : null}
              <tr
                onClick={toggleSelection}
                onPointerEnter={() => onActiveKey(anchor.key)}
                onPointerLeave={() => onActiveKey(selectedKey)}
                className={clsx(
                  "cursor-pointer border-t border-white/5 transition",
                  isActive && "bg-cyan-300/[0.12]",
                  onNet && "bg-cyan-300/[0.05]",
                  !isActive && !onNet && "hover:bg-white/[0.04]",
                  dimmed && "opacity-40",
                )}
              >
                <td className="px-0.5 py-1 font-mono text-xs text-zinc-500">
                  {anchor.pin.position}
                </td>
                <th
                  scope="row"
                  className="min-w-0 py-1 pr-2 text-left font-normal"
                >
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleSelection();
                    }}
                    className="print-reference-control min-h-11 min-w-11 w-full truncate rounded text-left font-mono text-[13px] font-semibold text-white outline-none transition hover:text-cyan-200 focus-visible:ring-1 focus-visible:ring-cyan-300"
                    aria-label={`${isSelected ? "Unselect" : "Select"} pin ${anchor.pin.position}, ${anchor.pin.label}`}
                    aria-pressed={isSelected}
                  >
                    {anchor.pin.label}
                  </button>
                </th>
                <td className="py-1 pr-2">
                  <span
                    className="inline-flex whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-medium"
                    style={roleChipStyle(anchor.pin.role)}
                  >
                    {roleLabels[anchor.pin.role]}
                  </span>
                </td>
                <td
                  className={clsx(
                    "truncate py-1 pr-2 font-mono text-[11px] @max-[26rem]:hidden",
                    onNet || isActive
                      ? "text-cyan-200"
                      : "text-zinc-500",
                  )}
                >
                  {net ? net.label : ""}
                </td>
                <td className="break-words py-1 pr-1 text-[11px] leading-4 text-zinc-400">
                  {anchor.pin.aliases?.length
                    ? anchor.pin.aliases.join(" / ")
                    : ""}
                  {anchor.pin.aliases?.length && pinCautionTexts(anchor.pin, flagNotes).length ? " · " : ""}
                  {pinCautionTexts(anchor.pin, flagNotes).join(" · ")}
                </td>
              </tr>
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
