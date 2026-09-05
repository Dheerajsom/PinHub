import type { Board } from "@/lib/boards";
import type { BoardGeometry } from "@/lib/board-visual-geometry";

export type RaspberryPiModel = {
  family: "sbc" | "zero" | "pico" | "keyboard";
  silicon: string;
  wireless?: boolean;
  generation?: number;
  compact?: boolean;
};

// Visual identities only. Electrical labels and roles always come from boards.ts.
// Layout references: raspberrypi.com/documentation/computers/raspberry-pi.html
// and raspberrypi.com/documentation/microcontrollers/pico-series.html.
export const raspberryPiModels: Record<string, RaspberryPiModel> = {
  "raspberry-pi-5": { family: "sbc", silicon: "BCM2712", generation: 5, wireless: true },
  "raspberry-pi-4-model-b": { family: "sbc", silicon: "BCM2711", generation: 4, wireless: true },
  "raspberry-pi-3-model-b-plus": { family: "sbc", silicon: "BCM2837B0", generation: 3, wireless: true },
  "raspberry-pi-3-model-a-plus": { family: "sbc", silicon: "BCM2837B0", generation: 3, wireless: true, compact: true },
  "raspberry-pi-2-model-b": { family: "sbc", silicon: "BCM2836 / 2837", generation: 2 },
  "raspberry-pi-1-model-b-plus": { family: "sbc", silicon: "BCM2835", generation: 1 },
  "raspberry-pi-zero-2-w": { family: "zero", silicon: "RP3A0", generation: 2, wireless: true },
  "raspberry-pi-zero-w": { family: "zero", silicon: "BCM2835", generation: 1, wireless: true },
  "raspberry-pi-zero": { family: "zero", silicon: "BCM2835", generation: 1 },
  "raspberry-pi-pico": { family: "pico", silicon: "RP2040", generation: 1 },
  "raspberry-pi-pico-w": { family: "pico", silicon: "RP2040", generation: 1, wireless: true },
  "raspberry-pi-pico-2": { family: "pico", silicon: "RP2350", generation: 2 },
  "raspberry-pi-pico-2-w": { family: "pico", silicon: "RP2350", generation: 2, wireless: true },
  "raspberry-pi-400": { family: "keyboard", silicon: "BCM2711", generation: 4 },
  "raspberry-pi-500": { family: "keyboard", silicon: "BCM2712", generation: 5 },
};

export function raspberryPiModel(id: string): RaspberryPiModel | undefined {
  return Object.hasOwn(raspberryPiModels, id) ? raspberryPiModels[id] : undefined;
}

/** Adapt the shared geometry to a Pi board, preserving every source pin object. */
export function raspberryPiGeometry(board: Board, geometry: BoardGeometry): BoardGeometry {
  const model = raspberryPiModel(board.id);
  if (!model) return geometry;
  const { body } = geometry;
  const keyboard = model.family === "keyboard";
  const pico = model.family === "pico";
  const pitch = pico ? geometry.pitch : body.w * (model.family === "zero" ? 0.80 : keyboard ? 0.76 : model.compact ? 0.78 : 0.60) / 19;
  const startX = body.x + body.w * (keyboard ? 0.12 : 0.08);
  const outerY = body.y + (keyboard ? 45 : 37);
  const innerY = outerY + pitch;
  const anchors = pico ? geometry.anchors : geometry.anchors.map((anchor) => {
    const odd = anchor.pin.position % 2 === 1;
    return {
      ...anchor,
      cx: startX + Math.floor((anchor.pin.position - 1) / 2) * pitch,
      // Component side: pin 1 is the inner row at the left. Keyboard computers
      // deliberately use a separate schematic connector, not a case pin map.
      cy: odd ? innerY : outerY,
      side: odd ? "bottom" as const : "top" as const,
      labelX: startX + Math.floor((anchor.pin.position - 1) / 2) * pitch,
      labelY: odd ? body.y + body.h + 20 : body.y - 20,
      labelAnchor: odd ? "end" as const : "start" as const,
    };
  });
  const padR = pico ? geometry.padR : Math.min(10, pitch * 0.3);
  const inset = 29;
  const holes = pico || keyboard ? [] : [
    { x: body.x + inset, y: body.y + inset, r: 10 },
    { x: body.x + body.w * (model.family === "zero" || model.compact ? 0.965 : 0.765), y: body.y + inset, r: 10 },
    { x: body.x + inset, y: body.y + body.h - inset, r: 10 },
    { x: body.x + body.w * (model.family === "zero" || model.compact ? 0.965 : 0.765), y: body.y + body.h - inset, r: 10 },
  ];
  return {
    ...geometry,
    artworkId: board.id,
    anchors,
    pitch,
    padR,
    holes,
    // Model-specific connector silhouettes are drawn inside the artwork.
    ports: [],
    headerZones: pico ? geometry.headerZones : [{ x: startX - 16, y: outerY - 16, w: pitch * 19 + 32, h: pitch + 32, rx: 4 }],
    notToScale: keyboard,
    orientation: keyboard
      ? "Connector reference above keyboard silhouette; locate pin 1 on the rear case before wiring"
      : pico ? geometry.orientation : "Component side up; GPIO header at top, pin 1 on the inner row at left",
    revisionNote: keyboard
      ? "The displayed header is a schematic reference, not a physical rear-view map. Rear connector orientation differs from a bare Pi."
      : "Component placement is illustrated; small components and markings may vary with board revision.",
  };
}
