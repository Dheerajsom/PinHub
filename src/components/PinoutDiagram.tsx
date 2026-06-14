import { clsx } from "clsx";
import type { Pin, PinRole, Pinout, PinoutGroup } from "@/lib/boards";

const roleStyles: Record<PinRole, string> = {
  power: "border-red-400/50 bg-red-500/15 text-red-100",
  ground: "border-zinc-400/40 bg-zinc-500/20 text-zinc-100",
  gpio: "border-emerald-400/50 bg-emerald-500/15 text-emerald-100",
  i2c: "border-cyan-400/50 bg-cyan-500/15 text-cyan-100",
  spi: "border-amber-400/50 bg-amber-500/15 text-amber-100",
  uart: "border-sky-400/50 bg-sky-500/15 text-sky-100",
  adc: "border-violet-400/50 bg-violet-500/15 text-violet-100",
  dac: "border-rose-400/50 bg-rose-500/15 text-rose-100",
  pwm: "border-fuchsia-400/50 bg-fuchsia-500/15 text-fuchsia-100",
  debug: "border-lime-400/50 bg-lime-500/15 text-lime-100",
  system: "border-orange-400/50 bg-orange-500/15 text-orange-100",
  special: "border-teal-400/50 bg-teal-500/15 text-teal-100",
  reserved: "border-stone-400/50 bg-stone-500/15 text-stone-100",
};

const roleLabels: Record<PinRole, string> = {
  power: "Power",
  ground: "Ground",
  gpio: "GPIO",
  i2c: "I2C",
  spi: "SPI",
  uart: "UART",
  adc: "ADC",
  dac: "DAC",
  pwm: "PWM",
  debug: "Debug",
  system: "System",
  special: "Alt",
  reserved: "Reserved",
};

type PinoutDiagramProps = {
  pinout?: Pinout;
};

export function PinoutDiagram({ pinout }: PinoutDiagramProps) {
  if (!pinout) {
    return (
      <section className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-4">
        <div className="text-sm font-medium text-white">Pin map queued</div>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          This board has official references linked, but its in-app connector map
          still needs a source-backed import.
        </p>
      </section>
    );
  }

  const presentRoles = new Set<PinRole>(
    [
      ...(pinout.pins ? [...pinout.pins.left, ...pinout.pins.right] : []),
      ...(pinout.groups ?? []).flatMap((group) => group.pins),
    ].map((pin) => pin.role),
  );

  return (
    // @container lets the pin grid respond to the detail panel's real width
    // rather than the viewport, so the pads shrink on narrow phone panels.
    <section className="@container rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
            Connector
          </div>
          <h3 className="mt-1 text-base font-semibold text-white">
            {pinout.connector}
          </h3>
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Pin role legend">
          {Object.entries(roleLabels)
            .filter(([role]) => presentRoles.has(role as PinRole))
            .map(([role, label]) => (
              <span
                key={role}
                className={clsx(
                  "rounded border px-1.5 py-0.5 text-[11px] font-medium",
                  roleStyles[role as PinRole],
                )}
              >
                {label}
              </span>
            ))}
        </div>
      </div>

      {pinout.pins ? <DualRowPins pins={pinout.pins} /> : null}
      {pinout.groups ? <GroupedPins groups={pinout.groups} /> : null}

      <ul className="mt-5 space-y-1.5 border-t border-white/10 pt-4 text-sm leading-6 text-zinc-400">
        {pinout.notes.map((note) => (
          <li key={note} className="flex gap-2">
            <span
              className="mt-2.5 size-1 shrink-0 rounded-full bg-zinc-600"
              aria-hidden="true"
            />
            <span className="min-w-0">{note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

type DualRowPinsProps = {
  pins: NonNullable<Pinout["pins"]>;
};

// Two physical columns of pads with their signal labels flanking them, so the
// layout reads like a real dual-row header. Labels hug the central pads and any
// overflow is pushed to the outer edges, keeping each label tied to its pad.
function DualRowPins({ pins }: DualRowPinsProps) {
  return (
    <div className="mt-5 grid gap-y-2">
      {pins.left.map((leftPin, index) => {
        const rightPin = pins.right[index];

        return (
          <div
            key={`${leftPin.position}-${rightPin?.position ?? "empty"}`}
            className="grid grid-cols-[minmax(0,1fr)_2.25rem_2.25rem_minmax(0,1fr)] items-center gap-x-1.5 @sm:grid-cols-[minmax(0,1fr)_3rem_3rem_minmax(0,1fr)] @sm:gap-x-2"
          >
            <DualRowLabel pin={leftPin} side="left" />
            <PinPad pin={leftPin} />
            {rightPin ? <PinPad pin={rightPin} /> : <div />}
            {rightPin ? (
              <DualRowLabel pin={rightPin} side="right" />
            ) : (
              <div />
            )}
          </div>
        );
      })}
    </div>
  );
}

type DualRowLabelProps = {
  pin: Pin;
  side: "left" | "right";
};

function DualRowLabel({ pin, side }: DualRowLabelProps) {
  // The left column sits to the left of the central pads, so its text is
  // right-aligned to meet the pad; the right column mirrors it.
  const towardCenter = side === "left";
  const label = (
    <span className="min-w-0 truncate font-mono text-sm font-semibold text-white">
      {pin.label}
    </span>
  );
  const role = (
    <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
      {roleLabels[pin.role]}
    </span>
  );

  return (
    <div className={clsx("min-w-0", towardCenter ? "text-right" : "text-left")}>
      <div
        className={clsx(
          "flex min-w-0 items-baseline gap-1.5",
          towardCenter ? "justify-end" : "justify-start",
        )}
      >
        {towardCenter ? (
          <>
            {role}
            {label}
          </>
        ) : (
          <>
            {label}
            {role}
          </>
        )}
      </div>
      {pin.aliases?.length ? (
        <div className="truncate text-[11px] text-zinc-400">
          {pin.aliases.join(" / ")}
        </div>
      ) : null}
    </div>
  );
}

type GroupedPinsProps = {
  groups: PinoutGroup[];
};

// Connectors without a clean two-column geometry are shown as labelled groups.
// The grid uses auto-fill with a fixed minimum so the column count follows the
// detail panel's real width rather than the viewport — preventing the cramped
// cells (and overlapping text) that viewport breakpoints caused here.
function GroupedPins({ groups }: GroupedPinsProps) {
  return (
    <div className="mt-5 space-y-5">
      {groups.map((group) => (
        <div key={group.label}>
          <h4 className="mb-2 text-sm font-semibold text-zinc-200">
            {group.label}
          </h4>
          <div className="grid gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr))]">
            {group.pins.map((pin) => (
              <GroupedPin
                key={`${group.label}-${pin.position}-${pin.label}`}
                pin={pin}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type GroupedPinProps = {
  pin: Pin;
};

function GroupedPin({ pin }: GroupedPinProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1.5">
      <PinPad pin={pin} compact />
      <div className="min-w-0 flex-1">
        <div className="truncate font-mono text-sm font-semibold leading-tight text-white">
          {pin.label}
        </div>
        <div className="truncate text-[11px] leading-tight text-zinc-400">
          <span className="uppercase tracking-[0.1em]">
            {roleLabels[pin.role]}
          </span>
          {pin.aliases?.length ? (
            <span className="text-zinc-500"> · {pin.aliases.join(" / ")}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type PinPadProps = {
  pin: Pin;
  compact?: boolean;
};

function PinPad({ pin, compact = false }: PinPadProps) {
  return (
    <span
      className={clsx(
        "inline-grid shrink-0 place-items-center rounded-full border font-mono font-semibold shadow-[0_0_18px_rgba(255,255,255,0.04)] ring-1 ring-white/10",
        compact
          ? "size-8 text-[10px]"
          : "mx-auto size-9 text-[11px] @sm:size-11 @sm:text-xs",
        roleStyles[pin.role],
      )}
      title={`${pin.position}: ${pin.label}`}
      aria-label={`Pin ${pin.position}, ${pin.label}, ${roleLabels[pin.role]}`}
    >
      {pin.position}
    </span>
  );
}
