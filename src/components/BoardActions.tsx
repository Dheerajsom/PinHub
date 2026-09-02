"use client";

import Link from "next/link";
import { Clipboard, Code2, GitCompareArrows, Link2, MoreHorizontal, Printer } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { Board } from "@/lib/boards";
import { boardPinSnippet } from "@/lib/board-utilities";
import { recordRecentBoard } from "@/lib/personal-library";
import { CollectionButton } from "@/components/CollectionButton";

export function BoardActions({ board }: { board: Board }) {
  // Changing boards also dismisses disclosures and clears clipboard feedback.
  return <BoardActionToolbar key={board.id} board={board} />;
}

function BoardActionToolbar({ board }: { board: Board }) {
  const [panel, setPanel] = useState<"collection" | "tools" | null>(null);
  const [feedback, setFeedback] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const moreButton = useRef<HTMLButtonElement>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toolsId = useId();
  const snippet = boardPinSnippet(board);

  useEffect(() => {
    recordRecentBoard(board.id);
    return () => { if (resetTimer.current) clearTimeout(resetTimer.current); };
  }, [board.id]);

  useEffect(() => {
    if (panel === null) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setPanel(null);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [panel]);

  async function copy(value: string, message: string) {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(message);
    } catch {
      setFeedback("Couldn’t copy. Check clipboard permission and try again.");
    }
    resetTimer.current = setTimeout(() => setFeedback(""), 3000);
  }

  return (
    <div ref={root} className="board-actions grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem] gap-2 sm:max-w-sm"
      onKeyDown={(event) => {
        if (event.key === "Escape" && panel === "tools") {
          event.preventDefault();
          setPanel(null);
          moreButton.current?.focus();
        }
      }}>
      <CollectionButton id={board.id} name={board.name} open={panel === "collection"} onOpenChange={(open) => setPanel(open ? "collection" : null)} />
      <Link href={`/compare?boards=${encodeURIComponent(board.id)}`} className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-2 text-xs font-medium text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-300/20">
        <GitCompareArrows className="size-4 shrink-0" aria-hidden="true" /> Compare
      </Link>
      <button ref={moreButton} type="button" aria-label="More board actions" title="More board actions" aria-expanded={panel === "tools"} aria-controls={toolsId}
        onClick={() => setPanel(panel === "tools" ? null : "tools")}
        className="grid size-11 place-items-center rounded-lg border border-white/10 bg-[#15181f] text-zinc-300 transition hover:border-cyan-300/40 hover:text-white">
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </button>
      {panel === "tools" ? (
        <div id={toolsId} role="region" aria-label="Copy and print tools" className="surface-well col-span-full rounded-lg p-1">
          <button type="button" onClick={() => copy(new URL(`/boards/${board.id}`, location.origin).href, "Board link copied.")} className="board-tool">
            <Link2 className="size-4" aria-hidden="true" /><span>Copy link</span>
          </button>
          <button type="button" onClick={() => copy(board.id, "Board ID copied.")} className="board-tool">
            <Clipboard className="size-4" aria-hidden="true" /><span>Copy board ID</span>
          </button>
          {snippet ? <button type="button" onClick={() => copy(snippet, "Pin lookup copied.")} className="board-tool">
            <Code2 className="size-4" aria-hidden="true" /><span>Copy pin lookup</span>
          </button> : null}
          <div className="mx-2 my-1 border-t border-white/10" />
          <button type="button" onClick={() => window.print()} className="board-tool">
            <Printer className="size-4" aria-hidden="true" /><span>Print reference</span>
          </button>
        </div>
      ) : null}
      <p role="status" aria-live="polite" className={feedback ? "col-span-full text-xs leading-5 text-zinc-400" : "sr-only"}>{feedback}</p>
    </div>
  );
}
