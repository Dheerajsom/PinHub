/**
 * Colorway data with no React, so the root layout (a server component) can
 * import the pre-paint snippet. The store and hook live in colorway.ts.
 *
 * Colorways reskin PinHub's chrome: surfaces, the interaction accent, text
 * inks, corner radius, and the page backdrop. Each one has a dark and a light
 * variant, so the theme choice (system, light, dark) still applies on top.
 *
 * What a colorway never changes: the meaning colors (orange hardware
 * caution, emerald official, green prices, amber favorites) and the pin map
 * itself (role hues and the probe), so a board reads the same in any skin.
 * The CSS lives in globals.css under `:root[data-colorway="…"]`.
 */
export type Colorway = "workbench" | "fab-purple" | "blueprint" | "silkscreen" | "anodized";

export const colorwayStorageKey = "pinhub.colorway";
export const defaultColorway: Colorway = "workbench";

/** A colorway's own colors, for the preview tile in settings. */
export type ColorwaySwatch = {
  /** Page background behind the panels. */
  ground: string;
  /** Raised panel. */
  panel: string;
  /** Primary text. */
  ink: string;
  /** Secondary text. */
  muted: string;
  /** Interaction accent. */
  accent: string;
  /** Pad and rule color on the mini board. */
  pad: string;
};

export type ColorwayInfo = {
  id: Colorway;
  name: string;
  /** One line on where the look comes from. */
  description: string;
  dark: ColorwaySwatch;
  light: ColorwaySwatch;
};

export const colorways: readonly ColorwayInfo[] = [
  {
    id: "workbench",
    name: "Workbench",
    description: "Graphite bench, cyan probe light. The original.",
    dark: { ground: "#090b0f", panel: "#14161d", ink: "#eef2f3", muted: "#9ca3af", accent: "#67e8f9", pad: "#2a2f3a" },
    light: { ground: "#edf2f4", panel: "#ffffff", ink: "#17202a", muted: "#536269", accent: "#0e7490", pad: "#cfd9de" },
  },
  {
    id: "fab-purple",
    name: "Fab Purple",
    description: "Purple solder mask from a hobby board fab, orchid traces.",
    dark: { ground: "#120b18", panel: "#1f1428", ink: "#f6eef8", muted: "#b8a9bd", accent: "#f0abfc", pad: "#3a2645" },
    light: { ground: "#f4eef6", panel: "#fffbff", ink: "#2a1530", muted: "#6a5570", accent: "#a21caf", pad: "#e2d3e7" },
  },
  {
    id: "blueprint",
    name: "Blueprint",
    description: "Drafting-table cyanotype: chalk lines, square corners, a grid.",
    dark: { ground: "#0a2348", panel: "#0f2c57", ink: "#eef4ff", muted: "#9fb4d6", accent: "#eaf2ff", pad: "#28467a" },
    light: { ground: "#eef2f8", panel: "#fbfcff", ink: "#0f1e3d", muted: "#4a5875", accent: "#1d4ed8", pad: "#cdd8ea" },
  },
  {
    id: "silkscreen",
    name: "Silkscreen",
    description: "Matte black mask, bright white legend. Highest contrast.",
    dark: { ground: "#000000", panel: "#0a0a0a", ink: "#ffffff", muted: "#d4d4d8", accent: "#67e8f9", pad: "#3f3f46" },
    light: { ground: "#ffffff", panel: "#ffffff", ink: "#000000", muted: "#33383e", accent: "#075563", pad: "#a1a1aa" },
  },
  {
    id: "anodized",
    name: "Anodized",
    description: "Brushed aluminum enclosure with an indigo anodize.",
    dark: { ground: "#101217", panel: "#1a1d24", ink: "#eceef4", muted: "#aeb2bf", accent: "#a5b4fc", pad: "#2f3440" },
    light: { ground: "#e8eaef", panel: "#f7f8fa", ink: "#161a24", muted: "#4f5667", accent: "#4338ca", pad: "#cfd3dc" },
  },
];

export const colorwayIds: readonly Colorway[] = colorways.map((colorway) => colorway.id);

export function isColorway(value: unknown): value is Colorway {
  return typeof value === "string" && (colorwayIds as readonly string[]).includes(value);
}

/** The stored value when it names a known colorway, otherwise the default. */
export function parseColorway(stored: string | null): Colorway {
  return isColorway(stored) ? stored : defaultColorway;
}

/** The inline pre-paint snippet, kept next to the list of ids it checks. */
export const colorwayBootScript = `var c=localStorage.getItem(${JSON.stringify(colorwayStorageKey)});if(${JSON.stringify(
  colorwayIds.filter((id) => id !== defaultColorway),
)}.indexOf(c)>-1)document.documentElement.dataset.colorway=c;`;
