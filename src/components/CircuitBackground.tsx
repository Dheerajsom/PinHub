import type { CSSProperties } from "react";
import { CAPTURE_WIDTH, captureLanes, laneTops, wavePath } from "@/components/bus-capture";

const LANE_HEIGHT = 44;
const HIGH = 17;
const LOW = 33;
const tops = laneTops(captureLanes);

/**
 * The page sits on a logic analyzer: ten channels of real, decodable bus
 * traffic (see bus-capture.ts) drawn in the catalog's pin-role hues and
 * scrolling slowly past a fixed trigger line, the way a running acquisition
 * does. The capture is strongest in the desktop gutters and quiet behind the
 * opaque panels; channel labels appear only where the gutter can hold them.
 * Motion stops for reduced-motion users and on narrow screens.
 */
export function CircuitBackground() {
  return (
    <div
      className="ph-scope pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ "--capture-width": `${CAPTURE_WIDTH}px` } as CSSProperties}
      aria-hidden="true"
    >
      <div className="ph-scope-base absolute inset-0" />
      <div className="ph-scope-divisions absolute inset-0" />

      <div className="ph-scope-capture absolute inset-0">
        <svg
          className="ph-scope-strip absolute left-0 top-0 h-full"
          width={CAPTURE_WIDTH * 2}
          fill="none"
          overflow="visible"
        >
          <defs>
            {captureLanes.map((lane, index) => (
              <g key={lane.name} id={`ph-lane-${index}`}>
                {lane.decodes.map((decode) => (
                  <g key={`${decode.x0}-${decode.text}`}>
                    <rect
                      className="ph-scope-decode"
                      x={decode.x0}
                      y={HIGH - 3}
                      width={decode.x1 - decode.x0}
                      height={LOW - HIGH + 6}
                      rx="2"
                      fill="currentColor"
                    />
                    <text
                      className="ph-scope-decode-text"
                      x={(decode.x0 + decode.x1) / 2}
                      y={HIGH - 6}
                      textAnchor="middle"
                      fill="currentColor"
                    >
                      {decode.text}
                    </text>
                  </g>
                ))}
                <path
                  className="ph-scope-glow"
                  d={wavePath(lane.wave, HIGH, LOW)}
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                <path
                  className="ph-scope-trace"
                  d={wavePath(lane.wave, HIGH, LOW)}
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinejoin="miter"
                />
              </g>
            ))}
          </defs>

          {captureLanes.map((lane, index) => (
            <svg
              key={lane.name}
              className={`ph-scope-lane ph-role-${lane.role}`}
              y={`${tops[index]}%`}
              height={LANE_HEIGHT}
              overflow="visible"
            >
              <use href={`#ph-lane-${index}`} />
              <use href={`#ph-lane-${index}`} x={CAPTURE_WIDTH} />
            </svg>
          ))}
        </svg>
      </div>

      <div className="ph-scope-trigger absolute inset-y-0">
        <span className="ph-scope-trigger-flag">T</span>
      </div>

      <ol className="ph-scope-channels absolute inset-y-0 left-0 m-0 list-none p-0">
        {captureLanes.map((lane, index) => (
          <li
            key={lane.name}
            className={`ph-scope-channel ph-role-${lane.role}`}
            style={{ top: `calc(${tops[index]}% + ${(HIGH + LOW) / 2}px)` }}
          >
            <span className="ph-scope-channel-index">D{index}</span>
            <span className="ph-scope-channel-name">{lane.name}</span>
          </li>
        ))}
      </ol>

      <div className="ph-scope-vignette absolute inset-0" />
    </div>
  );
}
