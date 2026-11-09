import type { Metadata } from "next";
import Link from "next/link";
import { Folder, GitCompareArrows, ShieldAlert } from "lucide-react";
import { boards, type Board } from "@/lib/boards";
import { collectionNameLimit, parseSharedCollectionIds } from "@/lib/collection-params";
import { compareUrl, maxComparedBoards } from "@/lib/compare-params";
import { CircuitBackground } from "@/components/CircuitBackground";
import { SaveSharedCollection } from "@/components/SaveSharedCollection";
import { SiteHeader } from "@/components/SiteHeader";
import { VendorLogo } from "@/components/VendorLogo";

export const metadata: Metadata = {
  title: "Shared board collection",
  description: "A shareable set of source-backed PinHub board references.",
  robots: { index: false, follow: true },
};

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string | string[]; boards?: string | string[] }>;
}) {
  const params = await searchParams;
  const nameValue = Array.isArray(params.name) ? params.name[0] : params.name;
  const name = nameValue?.trim().slice(0, collectionNameLimit) || "Shared PinHub collection";
  const selected = parseSharedCollectionIds(params.boards)
    .map((id) => boards.find((board) => board.id === id))
    .filter((board): board is Board => Boolean(board));
  // Comparison renders at most four boards. A larger collection compares its
  // first four, and the action says so instead of silently dropping the rest.
  const compared = selected.slice(0, maxComparedBoards);
  const partial = selected.length > compared.length;

  return (
    <main className="relative isolate min-h-screen pb-10">
      <CircuitBackground />
      <SiteHeader width="narrow" />
      <div className="relative mx-auto max-w-[860px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-cyan-200"><Folder className="size-4" aria-hidden="true" /> Shared collection</div>
            <h1 className="mt-2 text-3xl font-semibold text-white">{name}</h1>
            <p className="mt-2 text-sm text-zinc-400">{selected.length} source-backed board references</p>
          </div>
          {selected.length ? (
            <div className="flex flex-wrap items-start gap-2">
              {selected.length > 1 ? (
                <Link
                  href={compareUrl(compared.map((board) => board.id))}
                  aria-describedby={partial ? "compare-scope" : undefined}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-[#15181f] px-3 text-sm text-zinc-200 transition hover:border-cyan-300/40 hover:text-white"
                >
                  <GitCompareArrows className="size-4" aria-hidden="true" />
                  {partial ? `Compare first ${compared.length} of ${selected.length}` : "Compare these boards"}
                </Link>
              ) : null}
              <SaveSharedCollection name={name} boardIds={selected.map((board) => board.id)} />
            </div>
          ) : null}
        </div>
        {partial ? (
          <p id="compare-scope" className="mt-3 text-xs leading-5 text-zinc-400">
            Comparison shows {maxComparedBoards} boards at a time, so it opens with{" "}
            {compared.map((board) => board.name).join(", ")}. Use Compare on any other card to start from that board.
          </p>
        ) : null}
        {selected.length ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {selected.map((board) => (
              <article key={board.id} className="surface-panel rounded-xl p-4">
                <h2 className="flex items-center gap-2 font-semibold text-white"><VendorLogo vendor={board.vendor} /> {board.name}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-400">{board.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">{board.interfaces.slice(0, 6).map((item) => <span key={item} className="rounded border border-white/10 bg-zinc-950 px-1.5 py-0.5 text-[11px] text-zinc-300">{item}</span>)}</div>
                <div className="mt-3 flex flex-wrap gap-x-4 text-xs"><Link href={`/boards/${board.id}`} className="inline-flex min-h-11 items-center text-cyan-200 hover:text-white">Board reference</Link><Link href={compareUrl([board.id])} aria-label={`Compare ${board.name} with other boards`} className="inline-flex min-h-11 items-center text-zinc-400 hover:text-white">Compare</Link></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-white/15 bg-[#101319] p-8 text-center">
            <ShieldAlert className="mx-auto size-8 text-zinc-500" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold text-white">No valid boards in this link</h2>
            <p className="mt-2 text-sm text-zinc-400">The collection may be empty or refer to boards no longer in the catalog.</p>
            <Link href="/" className="mt-4 inline-flex rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-50">Browse boards</Link>
          </div>
        )}
      </div>
    </main>
  );
}
