/**
 * Every key PinHub writes to browser storage. The privacy page lists
 * them; test/privacy-page.test.ts fails when a new key is not listed.
 */
export const storedItems = [
  { key: "pinhub.theme", storage: "localStorage", label: "Theme", detail: "Light or dark, if you chose one. Choosing System in settings removes it." },
  { key: "pinhub.favorites", storage: "localStorage", label: "Favorites", detail: "The IDs of the boards you starred." },
  {
    key: "pinhub.library.v1",
    storage: "localStorage",
    label: "Recent boards and collections",
    detail: "The last few boards you opened, and the collections you saved, with their names and dates.",
  },
  {
    key: "pinhub.motion",
    storage: "localStorage",
    label: "Reduced motion",
    detail: "Present only if you turned motion down in settings.",
  },
  {
    key: "pinhub.colorway",
    storage: "localStorage",
    label: "Colorway",
    detail: "Present only if you picked a colorway other than Workbench in settings.",
  },
  { key: "pinhub.pinoutTab", storage: "localStorage", label: "Pinout view", detail: "Which pinout tab you last used, or chose in settings." },
  {
    key: "pinhub.check.draft",
    storage: "sessionStorage",
    label: "Code check draft",
    detail: "The code you pasted into Code check and its language, kept for this tab only and cleared when the tab closes.",
  },
] as const;
