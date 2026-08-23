import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Folder, ShieldAlert } from "lucide-react";
import { boards, type Board } from "@/lib/boards";
import { parseSharedCollectionIds } from "@/lib/collection-params";
import { CircuitBackground } from "@/components/CircuitBackground";
import { SaveSharedCollection } from "@/components/SaveSharedCollection";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  const name = nameValue?.trim().slice(0, 60) || "Shared PinHub collection";
  const selected = parseSharedCollectionIds(params.boards)
    .map((id) => boards.find((board) => board.id === id))
    .filter((board): board is Board => Boolean(board));
  const compareIds = selected.slice(0, 4).map((board) => board.id).join(",");

  return (
    <main className="relative isolate min-h-screen pb-10">
      <CircuitBackground />
      <header className="relative border-b border-white/10 bg-[#0a0d12] px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-cyan-200"><ArrowLeft className="size-4" /> Catalog</Link>
          <ThemeToggle />
        </div>
      </header>
      <div className="relative mx-auto max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-cyan-200"><Folder className="size-4" /> Shared collection</div>
            <h1 className="mt-2 text-3xl font-semibold text-white">{name}</h1>
            <p className="mt-2 text-sm text-zinc-400">{selected.length} source-backed board references</p>
          </div>
          {selected.length ? <SaveSharedCollection name={name} boardIds={selected.map((board) => board.id)} /> : null}
        </div>
        {selected.length ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {selected.map((board) => (
              <article key={board.id} className="surface-panel rounded-xl p-4">
                <h2 className="flex items-center gap-2 font-semibold text-white"><VendorLogo vendor={board.vendor} /> {board.name}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-400">{board.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">{board.interfaces.slice(0, 6).map((item) => <span key={item} className="rounded border border-white/10 bg-zinc-950 px-1.5 py-0.5 text-[11px] text-zinc-300">{item}</span>)}</div>
                <div className="mt-4 flex gap-3 text-xs"><Link href={`/boards/${board.id}`} className="text-cyan-200 hover:text-white">Board reference</Link>{compareIds ? <Link href={`/compare?boards=${compareIds}`} className="text-zinc-400 hover:text-white">Compare set</Link> : null}</div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-white/15 bg-[#101319] p-8 text-center">
            <ShieldAlert className="mx-auto size-8 text-zinc-500" />
            <h2 className="mt-3 text-lg font-semibold text-white">No valid boards in this link</h2>
            <p className="mt-2 text-sm text-zinc-400">The collection may be empty or refer to boards no longer in the catalog.</p>
            <Link href="/" className="mt-4 inline-flex rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-50">Browse boards</Link>
          </div>
        )}
      </div>
    </main>
  );
}
