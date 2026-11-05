// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CollectionPanel } from "@/components/CollectionPanel";
import { CopyPinButton } from "@/components/CopyPinButton";
import { LibraryRail } from "@/components/ProjectShelf";
import { FavoriteLimitToast, useFavoriteToggle } from "@/components/catalog/useFavoriteToggle";
import { summarizeBoard } from "@/lib/board-summary";
import { boards, type Pin } from "@/lib/boards";
import { getPersonalLibrarySnapshot, removeCollection, saveCollection } from "@/lib/personal-library";

const catalog = boards.map((board, index) => summarizeBoard(board, index));
const [first, second] = boards;

function refuseStorage() {
  return vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("quota", "QuotaExceededError");
  });
}

function mockClipboard(writeText: (text: string) => Promise<void>) {
  const spy = vi.fn(writeText);
  Object.defineProperty(navigator, "clipboard", { value: { writeText: spy }, configurable: true });
  return spy;
}

// Ends with a stored write, so durability from a previous test cannot leak.
function clearLibrary() {
  saveCollection("reset");
  for (const collection of getPersonalLibrarySnapshot().collections) removeCollection(collection.id);
}

beforeEach(() => {
  window.localStorage.clear();
  clearLibrary();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

function FavoriteHarness({ id }: { id: string }) {
  const { onToggleFavorite, favoriteMessage } = useFavoriteToggle();
  return (
    <>
      <button type="button" onClick={() => onToggleFavorite(id)}>Star</button>
      <FavoriteLimitToast message={favoriteMessage} />
    </>
  );
}

describe("favorite durability feedback", () => {
  it("keeps a visible session-only notice after a refused write, until dismissed or stored", () => {
    render(<FavoriteHarness id={first.id} />);
    const setItem = refuseStorage();
    fireEvent.click(screen.getByRole("button", { name: "Star" }));
    expect(screen.getByText(/Favorites are kept for this visit only/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss favorites storage notice" }));
    expect(screen.queryByText(/kept for this visit only/)).toBeNull();

    // A new refused write brings the notice back.
    fireEvent.click(screen.getByRole("button", { name: "Star" }));
    expect(screen.getByText(/kept for this visit only/)).toBeTruthy();

    // A stored write means memory and storage agree again.
    setItem.mockRestore();
    fireEvent.click(screen.getByRole("button", { name: "Star" }));
    expect(screen.queryByText(/kept for this visit only/)).toBeNull();
  });

  it("explains an invalid favorite instead of doing nothing", () => {
    render(<FavoriteHarness id="Not/A Board" />);
    fireEvent.click(screen.getByRole("button", { name: "Star" }));
    expect(screen.getByText("This board can’t be saved as a favorite.")).toBeTruthy();
  });
});

describe("collection dialog feedback", () => {
  it("never reports a refused create as saved", () => {
    render(<CollectionPanel id={first.id} name={first.name} onClose={() => {}} />);
    refuseStorage();
    fireEvent.change(screen.getByRole("textbox", { name: "New collection name" }), {
      target: { value: "Quota bench" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    const status = screen.getAllByRole("status").find((node) => node.textContent);
    expect(status?.textContent).toMatch(/^Created Quota bench with .+ for this visit only\./);
    expect(status?.textContent).toMatch(/lost after a reload/);
  });

  it("confirms stored creates and membership changes", () => {
    render(<CollectionPanel id={first.id} name={first.name} onClose={() => {}} />);
    fireEvent.change(screen.getByRole("textbox", { name: "New collection name" }), {
      target: { value: "Robotics" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(screen.getByText(`Created Robotics with ${first.name}.`)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Robotics" }));
    expect(screen.getByText(`Removed ${first.name} from Robotics.`)).toBeTruthy();

    refuseStorage();
    fireEvent.click(screen.getByRole("button", { name: "Robotics" }));
    expect(screen.getByText(new RegExp(`Added ${first.name} to Robotics for this visit only`))).toBeTruthy();
  });
});

describe("library rail feedback", () => {
  it("offers a selectable link when copying a share link is refused", async () => {
    saveCollection("Bench", [first.id, second.id]);
    render(<LibraryRail catalog={catalog} />);
    mockClipboard(() => Promise.reject(new DOMException("denied", "NotAllowedError")));
    fireEvent.click(screen.getByRole("button", { name: "Copy share link for Bench" }));

    expect(await screen.findByText(/Couldn’t copy the share link for Bench/)).toBeTruthy();
    const link = screen.getByRole("textbox", { name: /Select this link to copy it/ }) as HTMLInputElement;
    expect(link.readOnly).toBe(true);
    expect(link.value).toContain("/collections?");
    expect(link.value).toContain(first.id);
    expect(screen.getByRole("link", { name: "Open shareable view" })).toBeTruthy();

    // A successful retry replaces the failure with a confirmation.
    mockClipboard(() => Promise.resolve());
    fireEvent.click(screen.getByRole("button", { name: "Copy share link for Bench" }));
    expect(await screen.findByText("Copied share link for Bench.")).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: /Select this link/ })).toBeNull();
  });

  it("marks a deletion and the library as session-only when storage refuses the write", () => {
    saveCollection("Bench", [first.id]);
    render(<LibraryRail catalog={catalog} />);
    expect(screen.queryByText(/Kept for this visit only/)).toBeNull();
    refuseStorage();
    fireEvent.click(screen.getByRole("button", { name: "Delete Bench" }));
    expect(screen.getByText("For this visit only. It returns after a reload.")).toBeTruthy();
    expect(screen.getByText(/Kept for this visit only\. This browser is not storing/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByText("Restored Bench for this visit only.")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("region", { name: "Collections" }));
  });

  it("keeps the Undo toast while it has focus", () => {
    vi.useFakeTimers();
    try {
      saveCollection("Bench", [first.id]);
      render(<LibraryRail catalog={catalog} />);
      fireEvent.click(screen.getByRole("button", { name: "Delete Bench" }));
      const undo = screen.getByRole("button", { name: "Undo" });
      act(() => undo.focus());
      act(() => vi.advanceTimersByTime(10_000));
      expect(screen.getByRole("button", { name: "Undo" })).toBeTruthy();
      act(() => undo.blur());
      act(() => vi.advanceTimersByTime(6_000));
      expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("pin copy feedback", () => {
  const pin: Pin = { position: 7, label: "GPIO4", role: "gpio" } as Pin;

  it.each(["resolve", "reject"] as const)("ignores a pending copy's %s after pin selection changes", async (outcome) => {
    let resolve!: () => void;
    let reject!: (reason: Error) => void;
    mockClipboard(() => new Promise<void>((yes, no) => { resolve = yes; reject = no; }));
    const { rerender } = render(<CopyPinButton pin={pin} withLabel />);
    fireEvent.click(screen.getByRole("button"));
    rerender(<CopyPinButton pin={{ ...pin, position: 8, label: "GPIO5" }} withLabel />);
    await act(async () => { if (outcome === "resolve") resolve(); else reject(new Error("denied")); });
    expect(screen.getByRole("button").textContent).toBe("Copy");
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("keeps the latest copy result when an older request finishes later", async () => {
    const pending: { resolve: () => void; reject: (reason: Error) => void }[] = [];
    mockClipboard(() => new Promise<void>((resolve, reject) => pending.push({ resolve, reject })));
    render(<CopyPinButton pin={pin} withLabel />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("button"));
    await act(async () => pending[1].resolve());
    expect(screen.getByRole("button").textContent).toBe("Copied");
    await act(async () => pending[0].reject(new Error("old request denied")));
    expect(screen.getByRole("button").textContent).toBe("Copied");
  });

  it("shows and announces a refused copy, and recovers on retry", async () => {
    mockClipboard(() => Promise.reject(new DOMException("denied", "NotAllowedError")));
    render(<CopyPinButton pin={pin} withLabel />);
    fireEvent.click(screen.getByRole("button", { name: "Copy pin 7, GPIO4" }));
    await waitFor(() => expect(screen.getByRole("button").textContent).toBe("Copy failed"));
    expect(screen.getByRole("status").textContent).toMatch(/Couldn’t copy pin 7/);

    mockClipboard(() => Promise.resolve());
    fireEvent.click(screen.getByRole("button", { name: "Copy pin 7, GPIO4" }));
    await waitFor(() => expect(screen.getByRole("button").textContent).toBe("Copied"));
    expect(screen.getByRole("status").textContent).toBe("Copied pin 7, GPIO4.");
  });

  it("does not carry a failure over to a different pin", async () => {
    mockClipboard(() => Promise.reject(new Error("denied")));
    const { rerender } = render(<CopyPinButton pin={pin} withLabel />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByRole("button").textContent).toBe("Copy failed"));
    rerender(<CopyPinButton pin={{ ...pin, position: 8, label: "GPIO5" }} withLabel />);
    expect(screen.getByRole("button").textContent).toBe("Copy");
    expect(screen.getByRole("status").textContent).toBe("");
  });
});
