import type { Metadata } from "next";
import Link from "next/link";
import { boards, type Board } from "@/lib/boards";
import { summarizeBoard } from "@/lib/board-summary";
import { parseSharedCollectionIds } from "@/lib/collection-params";
import { AppHeader } from "@/components/shell/AppHeader";
import { LibraryView } from "@/components/library/LibraryView";
import { SaveSharedCollection } from "@/components/SaveSharedCollection";
import { Section } from "@/components/board/BoardBlocks";
import { VendorLogo } from "@/components/VendorLogo";

export const metadata: Metadata = {
  title: "Saved boards",
  description:
    "Saved boards, recently inspected boards, and named collections — all kept on this device.",
  robots: { index: false, follow: true },
};

const catalog = boards.map((board, index) => summarizeBoard(board, index));

/**
 * Two jobs on one route, decided by the query string.
 *
 * With `?boards=`, this is somebody else's shared collection, opened read-only
 * with an explicit control to save it. Without it, this is your own library —
 * which is what the "Saved" entry in the header points at.
 */
export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string | string[]; boards?: string | string[] }>;
}) {
  const params = await searchParams;
  const nameValue = Array.isArray(params.name) ? params.name[0] : params.name;
  const sharedIds = parseSharedCollectionIds(params.boards);
  const isSharedLink = sharedIds.length > 0 || params.boards !== undefined;
  const name = nameValue?.trim().slice(0, 60) || "Shared collection";
  const selected = sharedIds
    .map((id) => boards.find((board) => board.id === id))
    .filter((board): board is Board => Boolean(board));

  return (
    <div className="panel-grain flex min-h-screen flex-col">
      <AppHeader section="saved" context={isSharedLink ? name : undefined} />

      <main className="mx-auto w-full max-w-[1720px] flex-1 px-4 py-3 sm:px-6">
        {!isSharedLink ? (
          <>
            <div className="mb-3">
              <h1 className="readout text-2xl uppercase text-ink">
                Saved on this device
              </h1>
              <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-dim">
                PinHub has no accounts. Your shortlist, history, and collections
                live in this browser, and a collection is only shared when you
                copy its link.
              </p>
            </div>
            <LibraryView catalog={catalog} />
          </>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="silk">Shared collection</p>
                <h1 className="readout mt-1 text-2xl uppercase text-ink">
                  {name}
                </h1>
                <p className="mt-1 text-[13px] text-dim">
                  {selected.length} source-backed board
                  {selected.length === 1 ? "" : "s"}
                  {selected.length < sharedIds.length
                    ? ` · ${sharedIds.length - selected.length} id${sharedIds.length - selected.length === 1 ? "" : "s"} in this link are not in the catalog`
                    : ""}
                </p>
              </div>
              {selected.length ? (
                <SaveSharedCollection
                  name={name}
                  boardIds={selected.map((board) => board.id)}
                />
              ) : null}
            </div>

            {selected.length ? (
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {selected.map((board) => (
                  <li key={board.id}>
                    <Section legend={board.category}>
                      <h2 className="readout flex items-center gap-2 text-base uppercase text-ink">
                        <VendorLogo vendor={board.vendor} size={18} />
                        {board.name}
                      </h2>
                      <p className="mt-1 line-clamp-3 text-[13px] leading-snug text-dim">
                        {board.description}
                      </p>
                      <ul className="mt-2 flex flex-wrap gap-1">
                        {board.interfaces.slice(0, 6).map((item) => (
                          <li key={item} className="chip">
                            {item}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 flex gap-1.5">
                        <Link href={`/boards/${board.id}`} className="ctl !min-h-8">
                          Open board
                        </Link>
                        {board.pinout ? (
                          <Link
                            href={`/pinout/${board.id}`}
                            className="ctl !min-h-8"
                          >
                            Pinout
                          </Link>
                        ) : null}
                      </div>
                    </Section>
                  </li>
                ))}
              </ul>
            ) : (
              <section className="panel p-6 text-center">
                <p className="silk">Nothing to show</p>
                <h2 className="readout mt-1.5 text-xl uppercase text-ink">
                  No catalog boards in this link
                </h2>
                <p className="mx-auto mt-2 max-w-md text-[13px] leading-snug text-dim">
                  The link is either empty or names boards that are no longer in
                  the catalog. Nothing was saved.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                  <Link href="/" className="ctl">
                    Browse the index
                  </Link>
                  <Link href="/collections" className="ctl">
                    See your saved boards
                  </Link>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
