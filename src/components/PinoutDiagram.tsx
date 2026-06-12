import { clsx } from "clsx";
import type { Pin, PinRole, Pinout } from "@/lib/boards";

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

  const presentRoles = new Set<PinRole>([
    ...(pinout.pins ? [...pinout.pins.left, ...pinout.pins.right] : []),
    ...(pinout.groups ?? []).flatMap((group) => group.pins),
  ].map((pin) => pin.role));

  return (
    <section className="rounded-lg border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
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

      {pinout.pins ? (
        <div className="mt-5 grid gap-2">
          {pinout.pins.left.map((leftPin, index) => {
            const rightPin = pinout.pins?.right[index];

            return (
              <div
                key={`${leftPin.position}-${rightPin?.position ?? "empty"}`}
                className="grid grid-cols-[minmax(0,1fr)_3rem_3rem_minmax(0,1fr)] items-center gap-2"
              >
                <PinCell pin={leftPin} align="left" showPad={false} />
                <PinPad pin={leftPin} />
                {rightPin ? <PinPad pin={rightPin} /> : <div />}
                {rightPin ? (
                  <PinCell pin={rightPin} align="right" showPad={false} />
                ) : (
                  <div />
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {pinout.groups ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {pinout.groups.map((group) => (
            <div key={group.label}>
              <h4 className="mb-2 text-sm font-semibold text-zinc-200">
                {group.label}
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {group.pins.map((pin) => (
                  <PinCell key={`${group.label}-${pin.label}`} pin={pin} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <ul className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm leading-6 text-zinc-400">
        {pinout.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  );
}

type PinCellProps = {
  pin: Pin;
  align?: "left" | "right";
  showPad?: boolean;
};

function PinCell({ pin, align = "left", showPad = true }: PinCellProps) {
  return (
    <div
      className={clsx(
        "min-h-12 min-w-0",
        align === "right" && "text-right",
      )}
    >
      <div
        className={clsx(
          "flex min-w-0 items-center gap-2",
          align === "right" && "justify-end",
        )}
      >
        {align === "left" && showPad ? <PinPad pin={pin} compact /> : null}
        <span className="font-mono text-sm font-semibold">{pin.label}</span>
        <span className="text-[11px] uppercase tracking-[0.12em] opacity-75">
          {roleLabels[pin.role]}
        </span>
        {align === "right" && showPad ? <PinPad pin={pin} compact /> : null}
      </div>
      {pin.aliases?.length ? (
        <div className="mt-1 truncate text-xs opacity-80">
          {pin.aliases.join(" / ")}
        </div>
      ) : null}
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
        compact ? "size-8 text-[10px]" : "mx-auto size-11 text-xs",
        roleStyles[pin.role],
      )}
      title={`${pin.position}: ${pin.label}`}
      aria-label={`Pin ${pin.position}, ${pin.label}, ${roleLabels[pin.role]}`}
    >
      {pin.position}
    </span>
  );
}
