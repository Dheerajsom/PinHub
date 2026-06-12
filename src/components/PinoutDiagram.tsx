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
      <section className="border border-dashed border-white/15 bg-white/[0.03] p-4">
        <div className="text-sm font-medium text-white">Pin map queued</div>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          This board has official references linked, but its in-app connector map
          still needs a source-backed import.
        </p>
      </section>
    );
  }

  return (
    <section className="border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
            Connector
          </div>
          <h3 className="mt-1 text-base font-semibold text-white">
            {pinout.connector}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(roleLabels).map(([role, label]) => (
            <span
              key={role}
              className={clsx(
                "border px-2 py-1 text-[11px] font-medium",
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
                className="grid grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)] items-stretch gap-2"
              >
                <PinCell pin={leftPin} align="left" />
                <div className="grid grid-cols-2 overflow-hidden border border-white/10 bg-zinc-950 text-center font-mono text-xs text-zinc-400">
                  <span className="border-r border-white/10 py-3">
                    {leftPin.position}
                  </span>
                  <span className="py-3">{rightPin?.position}</span>
                </div>
                {rightPin ? <PinCell pin={rightPin} align="right" /> : <div />}
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
              <div className="grid gap-2">
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
};

function PinCell({ pin, align = "left" }: PinCellProps) {
  return (
    <div
      className={clsx(
        "min-h-12 border px-3 py-2",
        roleStyles[pin.role],
        align === "right" && "text-right",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-mono text-sm font-semibold">{pin.label}</span>
        <span className="text-[11px] uppercase tracking-[0.12em] opacity-75">
          {roleLabels[pin.role]}
        </span>
      </div>
      {pin.aliases?.length ? (
        <div className="mt-1 truncate text-xs opacity-80">
          {pin.aliases.join(" / ")}
        </div>
      ) : null}
    </div>
  );
}
