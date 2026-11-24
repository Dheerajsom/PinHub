import { Cable, ListFilter, ScanSearch, Route, type LucideIcon } from "lucide-react";

export type SiteTool = {
  href: string;
  /** The tool's name, the same one its page title uses. */
  label: string;
  /** One sentence on what it does, in the words of someone wiring a board. */
  summary: string;
  icon: LucideIcon;
};

/**
 * PinHub's workflows, listed under Tools in the section nav. Each label is the
 * tool's page name, and the summary says what it does in the words of someone
 * wiring a board, so the menu explains the product on its own.
 */
export const siteTools: readonly SiteTool[] = [
  {
    href: "/find",
    label: "Board finder",
    summary: "Say which buses and pins your project needs; see every board where they all fit at once.",
    icon: ListFilter,
  },
  {
    href: "/planner",
    label: "Pin planner",
    summary: "Mark the pins your circuit uses, then fit I2C, SPI, UART, PWM, and ADC into the rest.",
    icon: Route,
  },
  {
    href: "/check",
    label: "Code check",
    summary: "Paste a sketch or script and check every pin it uses against the board.",
    icon: ScanSearch,
  },
  {
    href: "/link",
    label: "Connect two boards",
    summary: "Wire two boards over UART or I2C, with logic-level warnings.",
    icon: Cable,
  },
];
