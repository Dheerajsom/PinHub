import type { BoardGeometry } from "@/lib/board-visual-geometry";

// The drawing's title block. Every engineering drawing carries one, and it
// answers the questions a reader has before they trust a single pin: what
// connector is this, how many pins, which way up, and how literally should the
// outline be read. Those are exactly the four things the catalog knows, so the
// block states them and claims nothing else.
export function TitleBlock({
  geometry,
  connector,
}: {
  geometry: BoardGeometry;
  connector: string;
}) {
  const fields = [
    { name: "Connector", value: connector },
    { name: "Pins", value: `${geometry.anchors.length} · ${geometry.arrangement}` },
    { name: "View", value: geometry.orientation },
    {
      name: "Outline",
      value: geometry.notToScale
        ? "Schematic — not to scale"
        : "Representative, not to scale",
    },
  ];

  return (
    <dl className="@container grid grid-cols-2 border-x border-b border-[var(--pin-frame)] @2xl:grid-cols-4">
      {fields.map((field, index) => (
        <div
          key={field.name}
          className={[
            "min-w-0 px-2.5 py-2",
            // Hairline cell rules, drawn only between cells so the block reads
            // as one ruled strip rather than four boxes.
            index % 2 === 1 ? "border-l border-[var(--pin-frame)]" : "",
            index < 2 ? "border-b border-[var(--pin-frame)] @2xl:border-b-0" : "",
            "@2xl:border-l @2xl:first:border-l-0 @2xl:border-[var(--pin-frame)]",
          ].join(" ")}
        >
          <dt className="pin-eyebrow">{field.name}</dt>
          <dd className="pin-tech mt-1 text-[11px] leading-4 text-[var(--pin-ink-strong)]">
            {field.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
