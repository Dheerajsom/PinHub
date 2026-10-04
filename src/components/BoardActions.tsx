"use client";

import Link from "next/link";
import {
  ArrowRight,
  Clipboard,
  Code2,
  FolderPlus,
  GitCompareArrows,
  Link2,
  MoreHorizontal,
  Printer,
  Route,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Board } from "@/lib/boards";
import { boardPinSnippet } from "@/lib/board-utilities";
import { recordRecentBoard } from "@/lib/personal-library";
import { CollectionPanel } from "@/components/CollectionPanel";

const actionLink =
  "flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#15181f] px-2.5 text-zinc-300 transition hover:border-cyan-300/50 hover:bg-[#1c2029] hover:text-white";

type BoardActionsProps = {
  board: Board;
  /** The catalog panel is a preview, so it links on to the full board page. */
  showBoardPage?: boolean;
};

export function BoardActions(props: BoardActionsProps) {
  // Changing boards also dismisses disclosures and clears clipboard feedback.
  return <BoardActionToolbar key={props.board.id} {...props} />;
}

/**
 * One row: where to go next (the board page, the planner) as labelled links,
 * and everything else — collections, compare, copy, print — behind More.
 */
function BoardActionToolbar({ board, showBoardPage = false }: BoardActionsProps) {
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

  const closeCollection = useCallback(() => {
    setPanel(null);
    moreButton.current?.focus();
  }, []);

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
    <div ref={root} className="board-actions grid grid-cols-[minmax(0,1fr)_2.75rem] gap-2"
      onKeyDown={(event) => {
        if (event.key === "Escape" && panel === "tools") {
          event.preventDefault();
          setPanel(null);
          moreButton.current?.focus();
        }
      }}>
      {/* A container so the trailing icons drop out before a label would
          truncate (two links share ~234 px on a 360 px phone). */}
      <div className="@container flex min-w-0 gap-2">
        {showBoardPage ? (
          <Link href={`/boards/${board.id}`} className={actionLink}>
            <span className="truncate">Board page</span>
            <ArrowRight className="hidden size-4 shrink-0 @[16rem]:block" aria-hidden="true" />
          </Link>
        ) : null}
        {board.pinout ? (
          <Link href={`/planner?board=${encodeURIComponent(board.id)}`} className={actionLink}>
            <span className="truncate">Plan pins</span>
            <Route className="hidden size-4 shrink-0 @[16rem]:block" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <button ref={moreButton} type="button" aria-label="More board actions" title="More board actions" aria-expanded={panel === "tools"} aria-controls={toolsId}
        onClick={() => setPanel(panel === "tools" ? null : "tools")}
        className="grid size-11 place-items-center rounded-lg border border-white/10 bg-[#15181f] text-zinc-300 transition hover:border-cyan-300/40 hover:text-white">
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </button>
      {panel === "tools" ? (
        <div id={toolsId} role="region" aria-label="Board tools" className="surface-well col-span-full rounded-lg p-1">
          <button type="button" onClick={() => setPanel("collection")} className="board-tool">
            <FolderPlus className="size-4" aria-hidden="true" /><span>Add to collection</span>
          </button>
          <Link href={`/compare?boards=${encodeURIComponent(board.id)}`} className="board-tool">
            <GitCompareArrows className="size-4" aria-hidden="true" /><span>Compare with other boards</span>
          </Link>
          <div className="mx-2 my-1 border-t border-white/10" />
          <button type="button" onClick={() => copy(new URL(`/boards/${board.id}`, location.origin).href, "Board link copied.")} className="board-tool">
            <Link2 className="size-4" aria-hidden="true" /><span>Copy link</span>
          </button>
          <button type="button" onClick={() => copy(board.id, "Board ID copied.")} className="board-tool">
            <Clipboard className="size-4" aria-hidden="true" /><span>Copy board ID</span>
          </button>
          {snippet ? <button type="button" onClick={() => copy(snippet, "Pin lookup copied.")} className="board-tool">
            <Code2 className="size-4" aria-hidden="true" /><span>Copy pin lookup</span>
          </button> : null}
          <button type="button" onClick={() => window.print()} className="board-tool">
            <Printer className="size-4" aria-hidden="true" /><span>Print reference</span>
          </button>
        </div>
      ) : null}
      {panel === "collection" ? (
        <CollectionPanel id={board.id} name={board.name} onClose={closeCollection} />
      ) : null}
      <p role="status" aria-live="polite" className={feedback ? "col-span-full text-xs leading-5 text-zinc-400" : "sr-only"}>{feedback}</p>
    </div>
  );
}
