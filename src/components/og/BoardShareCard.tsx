import { roleColors } from "@/components/board-visual/roles";
import type { ShareCardModel } from "@/lib/share-card";

// Rendered by next/og (Satori), not React DOM: inline styles only, and every
// element with more than one child needs an explicit `display: flex`.

export const shareCardSize = { width: 1200, height: 630 };

const surface = {
  base: "#090b0f",
  panel: "#0e1015",
  hairline: "#1c212b",
  text: "#eef2f6",
  muted: "#8b95a3",
  faint: "#5b6472",
};

const padding = 64;
const rowLabelWidth = 156;
const padAreaWidth = shareCardSize.width - padding * 2 - rowLabelWidth - 40;

function padMetrics(model: ShareCardModel) {
  const widest = Math.max(1, ...model.rows.map((row) => row.roles.length));
  const gap = widest > 40 ? 3 : 6;
  const width = Math.max(6, Math.min(30, Math.floor((padAreaWidth - gap * (widest - 1)) / widest)));
  const height = model.rows.length > 2 ? 22 : 34;
  return { gap, width, height };
}

function nameSize(name: string) {
  if (name.length > 40) return 50;
  if (name.length > 28) return 58;
  return 70;
}

export function BoardShareCard({
  model,
  logo,
  kind,
}: {
  model: ShareCardModel;
  /** The PinHub mark as a data URL. */
  logo: string;
  /** Which page the link opens. */
  kind: "Pinout" | "Board overview";
}) {
  const pad = padMetrics(model);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: surface.base,
        color: surface.text,
        padding,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws plain img elements. */}
        <img src={logo} width={52} height={52} alt="" />
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 1 }}>PinHub</div>
        <div style={{ display: "flex", flexGrow: 1 }} />
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: surface.muted,
            border: `1px solid ${surface.hairline}`,
            borderRadius: 8,
            padding: "6px 14px",
          }}
        >
          {kind}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: 44 }}>
        <div style={{ display: "flex", fontSize: 26, color: surface.muted }}>
          {model.pinCount
            ? `${model.vendor} · ${model.pinCount} pins${model.moreRows ? ` · ${model.rows.length + model.moreRows} connectors` : ""}`
            : model.vendor}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: nameSize(model.name),
            lineHeight: 1.05,
            letterSpacing: -1.5,
            marginTop: 6,
          }}
        >
          {model.name}
        </div>
        <div style={{ display: "flex", fontSize: 26, color: surface.muted, marginTop: 14 }}>
          {model.detail}
        </div>
      </div>

      <div style={{ display: "flex", flexGrow: 1 }} />

      {model.rows.length ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            backgroundColor: surface.panel,
            border: `1px solid ${surface.hairline}`,
            borderRadius: 14,
            padding: "18px 20px",
          }}
        >
          {model.rows.map((row, index) => (
            <div key={`${row.label}-${index}`} style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  width: rowLabelWidth,
                  fontSize: 16,
                  color: surface.faint,
                  paddingRight: 12,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {row.label}
              </div>
              <div style={{ display: "flex", gap: pad.gap }}>
                {row.roles.map((role, padIndex) => (
                  <div
                    key={padIndex}
                    style={{
                      display: "flex",
                      width: pad.width,
                      height: pad.height,
                      borderRadius: 4,
                      backgroundColor: roleColors[role].fill,
                      border: `2px solid ${roleColors[role].edge}`,
                    }}
                  />
                ))}
              </div>
              {row.more ? (
                <div style={{ display: "flex", fontSize: 16, color: surface.muted, marginLeft: 10 }}>
                  +{row.more}
                </div>
              ) : null}
            </div>
          ))}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 18, rowGap: 6, marginTop: 4 }}>
            {model.legend.map((item) => (
              <div key={item.role} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18 }}>
                <div
                  style={{
                    display: "flex",
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    backgroundColor: roleColors[item.role].edge,
                  }}
                />
                <div style={{ display: "flex", color: roleColors[item.role].ink }}>
                  {`${item.label} ${item.count}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", fontSize: 24, color: surface.muted }}>
          Specs, wiring cautions, and official sources
        </div>
      )}
    </div>
  );
}
