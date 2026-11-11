"use client";

import { CircleHelp, Info, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import { displayName, type CheckReport as Report, type CheckedPin, type Finding } from "@/lib/code-check/check";
import { placeText } from "@/lib/code-check/report-text";
import { roleColors, roleLabels } from "@/components/board-visual/roles";
import { statusGlyph, statusText } from "@/components/check/status";
import { headline, plural, tally } from "@/components/check/verdict";

const findingIcon: Record<Finding["severity"], LucideIcon> = { fix: OctagonAlert, check: TriangleAlert, note: Info };

/** A list key that stays unique when two findings or uses share a title. */
export function findingKey(item: Pick<Finding, "severity" | "title">, index: number): string {
  return `${item.severity}:${index}:${item.title}`;
}

function uniqueLines(pin: CheckedPin): number[] {
  return [...new Set(pin.refs.map((ref) => ref.line))];
}

function LineButtons({ lines, onLine }: { lines: number[]; onLine: (line: number) => void }) {
  return (
    <span className="flex flex-wrap gap-1">
      {lines.slice(0, 6).map((line) => (
        <button key={line} type="button" className="ph-check-line-chip" onClick={() => onLine(line)} aria-label={`Show line ${line} in the editor`}>
          L{line}
        </button>
      ))}
      {lines.length > 6 ? <span className="ph-check-line-chip" data-static="">+{lines.length - 6}</span> : null}
    </span>
  );
}

function PinCard({
  pin,
  selected,
  onSelect,
  onLine,
}: {
  pin: CheckedPin;
  selected: boolean;
  onSelect: () => void;
  onLine: (line: number) => void;
}) {
  const colors = roleColors[pin.pin.role];
  const name = displayName(pin.pin);
  const chip = pin.pin.mcu?.name && pin.pin.mcu.name !== name ? pin.pin.mcu.name : null;
  const findings = pin.status === "clear" ? pin.findings.filter((item) => item.severity === "note") : pin.findings;
  return (
    <li className="ph-check-card" data-status={pin.status} data-selected={selected ? "" : undefined}>
      <button
        type="button"
        className="ph-check-card-head"
        aria-pressed={selected}
        onClick={onSelect}
        aria-label={`${name}, ${statusText[pin.status]}. ${placeText(pin)}. Used as ${pin.usages.map((use) => use.label).join(", ")}.`}
      >
        <span
          className="ph-check-pad"
          aria-hidden="true"
          style={{ background: colors.fill, borderColor: colors.edge, color: colors.ink }}
          title={roleLabels[pin.pin.role]}
        >
          {pin.places[0]?.position}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span className="ph-check-pin-name">{name}</span>
            {chip ? <span className="ph-check-pin-sub">{chip}</span> : null}
          </span>
          <span className="ph-check-pin-sub block">{placeText(pin)}</span>
        </span>
        <span className="ph-check-status" data-status={pin.status}>
          <span className="ph-check-status-glyph" aria-hidden="true">{statusGlyph[pin.status]}</span>
          {statusText[pin.status]}
        </span>
      </button>
      <div className="ph-check-card-body">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="flex flex-wrap gap-1">
            {pin.usages.map((use, index) => (
              <span key={`${index}:${use.label}`} className="ph-check-use">{use.label}</span>
            ))}
          </span>
          <LineButtons lines={uniqueLines(pin)} onLine={onLine} />
        </div>
        {findings.length ? (
          <ul className="mt-3 grid gap-2.5">
            {findings.map((item, index) => {
              const Icon = findingIcon[item.severity];
              return (
                <li key={findingKey(item, index)} className="ph-check-finding" data-severity={item.severity}>
                  <Icon className="ph-check-finding-icon" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="ph-check-finding-title">{item.title}</p>
                    <p className="ph-check-finding-detail">{item.detail}</p>
                    {item.quote ? <blockquote className="ph-check-quote">{item.quote}</blockquote> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

export function CheckReport({
  report,
  dialect,
  selectedPin,
  onSelect,
  onLine,
  truncated = false,
}: {
  report: Report;
  dialect: string;
  selectedPin: string | null;
  onSelect: (id: string) => void;
  onLine: (line: number) => void;
  /** Part of the input was cut before the scan; the verdict cannot read as clear. */
  truncated?: boolean;
}) {
  const verdict = headline(report, { truncated });
  return (
    <div className="grid gap-3" role="region" aria-label="Check report">
      <section aria-labelledby="ph-check-summary" className="ph-check-summary" data-tone={verdict.tone}>
        <p className="ph-check-kicker">
          {report.pins.length ? `${plural(report.pins.length, "pin")} in ${dialect} code` : `${dialect} code`}
        </p>
        <h2 id="ph-check-summary" className="ph-check-headline">
          {verdict.text}
        </h2>
        <p className="ph-check-tally">
          {tally(report).map((item) => (
            <span key={item.status} data-status={item.status}>
              {item.text}
            </span>
          ))}
        </p>
        {/* The pins in the order the report lists them: a header of the code's pins. */}
        <ol className="ph-check-strip" aria-label="Pins your code uses">
          {report.pins.map((pin) => (
            <li key={pin.id}>
              <button
                type="button"
                className="ph-check-strip-pad"
                data-status={pin.status}
                aria-pressed={pin.id === selectedPin}
                aria-label={`${displayName(pin.pin)}, ${statusText[pin.status]}`}
                title={`${displayName(pin.pin)} · ${statusText[pin.status]}`}
                onClick={() => onSelect(pin.id)}
              >
                <span aria-hidden="true">{statusGlyph[pin.status]}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <ul className="grid gap-2.5" aria-label="Pin findings">
        {report.pins.map((pin) => (
          <PinCard
            key={pin.id}
            pin={pin}
            selected={pin.id === selectedPin}
            onSelect={() => onSelect(pin.id)}
            onLine={onLine}
          />
        ))}
      </ul>

      {report.missing.length ? (
        <section aria-labelledby="ph-check-missing" className="ph-check-aside">
          <h3 id="ph-check-missing" className="ph-check-aside-title">
            <CircleHelp className="size-4" aria-hidden="true" />
            Not matched to this board&apos;s record
          </h3>
          <ul className="mt-2 grid gap-2">
            {report.missing.map((item, index) => (
              <li key={`${item.ref.start}:${item.ref.usage.label}:${index}`} className="ph-check-aside-row">
                <button type="button" className="ph-check-line-chip" onClick={() => onLine(item.ref.line)} aria-label={`Show line ${item.ref.line} in the editor`}>
                  L{item.ref.line}
                </button>
                <span className="min-w-0">
                  <code className="ph-check-code-inline">{item.ref.text}</code>
                  <span className="ph-check-aside-text"> {item.reason}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.unfollowed.length ? (
        <section aria-labelledby="ph-check-unfollowed" className="ph-check-aside">
          <h3 id="ph-check-unfollowed" className="ph-check-aside-title">
            <Info className="size-4" aria-hidden="true" />
            Values PinHub couldn&apos;t follow
          </h3>
          <p className="ph-check-aside-text mt-1">
            These are worked out while the program runs, so check them by hand.
          </p>
          <ul className="mt-2 grid gap-2">
            {report.unfollowed.map((item, index) => (
              <li key={`${item.start}:${index}`} className="ph-check-aside-row">
                <button type="button" className="ph-check-line-chip" onClick={() => onLine(item.line)} aria-label={`Show line ${item.line} in the editor`}>
                  L{item.line}
                </button>
                <span className="min-w-0">
                  <code className="ph-check-code-inline">{item.text}</code>
                  <span className="ph-check-aside-text"> as {item.usage.label.toLowerCase()}</span>
                </span>
              </li>
            ))}
          </ul>
          {report.unfollowedDropped > 0 ? (
            <p className="ph-check-aside-text mt-2">and {report.unfollowedDropped.toLocaleString("en-US")} more not listed</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
