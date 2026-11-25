/**
 * Makes everything outside a modal inert: each child of <body> that does not
 * hold the modal, so the site header, the footer, and any other portal are
 * out of reach of Tab, the pointer, and assistive tech, not just <main>.
 * Returns a function that restores each element's own previous `inert`.
 */
export function inertOutside(modal: Element): () => void {
  const changed: Array<{ element: HTMLElement; was: boolean }> = [];
  for (const child of Array.from(document.body.children)) {
    if (!(child instanceof HTMLElement) || child.contains(modal) || child.tagName === "SCRIPT") continue;
    changed.push({ element: child, was: child.inert });
    child.inert = true;
  }
  return () => {
    for (const { element, was } of changed) element.inert = was;
  };
}
