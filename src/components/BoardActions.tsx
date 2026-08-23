"use client";

import Link from "next/link";
import {
  Check,
  Clipboard,
  Code2,
  GitCompareArrows,
  Link2,
  Printer,
  Star,
} from "lucide-react";
import { clsx } from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Board } from "@/lib/boards";
import { boardPinSnippet } from "@/lib/board-utilities";
import { toggleFavorite, useFavorites } from "@/lib/favorites";
import { recordRecentBoard } from "@/lib/personal-library";
import { toggleCompared, useCompared } from "@/lib/compare-tray";
import { CollectionButton } from "@/components/CollectionButton";

type CopyKind = "link" | "id" | "snippet";

/**
 * The row of operations for one board. Every control names the thing it does
 * and keeps that name through the whole interaction — "Save" becomes "Saved",
 * "Copy link" becomes "Copied".
 */
export function BoardActions({ board }: { board: Board }) {
  const favorite = useFavorites().has(board.id);
  const compared = useCompared().includes(board.id);
  const [copied, setCopied] = useState<CopyKind | null>(null);
  const [copyFailed, setCopyFailed] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snippet = boardPinSnippet(board);

  useEffect(() => {
    recordRecentBoard(board.id);
  }, [board.id]);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  const copy = useCallback(async (value: string, kind: CopyKind) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setCopyFailed(false);
    } catch {
      // Clipboard access can be refused (permissions, insecure context). Saying
      // nothing looks like a dead button, so report the failure instead of
      // quietly claiming success.
      setCopied(null);
      setCopyFailed(true);
    }
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setCopied(null);
      setCopyFailed(false);
    }, 2000);
  }, []);

  return (
    <div data-print="hide">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => toggleFavorite(board.id)}
          aria-pressed={favorite}
          className="ctl"
        >
          <Star
            className={clsx("size-3.5", favorite && "fill-current")}
            aria-hidden="true"
          />
          {favorite ? "Saved" : "Save"}
        </button>

        <button
          type="button"
          onClick={() => toggleCompared(board.id)}
          aria-pressed={compared}
          className="ctl"
        >
          <GitCompareArrows className="size-3.5" aria-hidden="true" />
          {compared ? "In comparison" : "Add to comparison"}
        </button>

        <CollectionButton id={board.id} name={board.name} />

        <Link href={`/pinout/${encodeURIComponent(board.id)}`} className="ctl">
          <Printer className="size-3.5" aria-hidden="true" />
          Reference sheet
        </Link>

        <button
          type="button"
          onClick={() => copy(window.location.href, "link")}
          className="ctl"
        >
          {copied === "link" ? (
            <Check className="size-3.5 text-verified" aria-hidden="true" />
          ) : (
            <Link2 className="size-3.5" aria-hidden="true" />
          )}
          {copied === "link" ? "Copied" : "Copy link"}
        </button>

        <button
          type="button"
          onClick={() => copy(board.id, "id")}
          className="ctl"
        >
          {copied === "id" ? (
            <Check className="size-3.5 text-verified" aria-hidden="true" />
          ) : (
            <Clipboard className="size-3.5" aria-hidden="true" />
          )}
          {copied === "id" ? "Copied" : "Copy board ID"}
        </button>

        {snippet ? (
          <button
            type="button"
            onClick={() => copy(snippet, "snippet")}
            className="ctl"
          >
            {copied === "snippet" ? (
              <Check className="size-3.5 text-verified" aria-hidden="true" />
            ) : (
              <Code2 className="size-3.5" aria-hidden="true" />
            )}
            {copied === "snippet" ? "Copied" : "Copy pin lookup"}
          </button>
        ) : null}
      </div>

      <p role="status" aria-live="polite" className="mt-1 text-[11px] text-faint">
        {copyFailed
          ? "Copying failed — the browser blocked clipboard access. Select the text and copy it manually."
          : copied
            ? "Copied to the clipboard."
            : ""}
      </p>
    </div>
  );
}
