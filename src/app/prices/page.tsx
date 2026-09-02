import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { boards } from "@/lib/boards";
import { boardPrices } from "@/lib/board-prices";
import { PricesApp } from "@/components/PricesApp";
import { SectionNav } from "@/components/SectionNav";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Board prices & availability",
  description: "Check dated USD prices, exact board variants, and retailer availability for popular boards in PinHub. Jump from a listing to its pinout.",
  alternates: { canonical: "/prices" },
};

const listings = boardPrices.map((price) => {
  const board = boards.find((item) => item.id === price.boardId);
  if (!board) throw new Error(`Price listing refers to missing board: ${price.boardId}`);
  return { ...price, name: board.name, vendor: board.vendor, category: board.category };
});

export default async function PricesPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await searchParams;
  // This dynamic server route captures request time after awaiting searchParams.
  // eslint-disable-next-line react-hooks/purity -- Server-only freshness snapshot, serialized for hydration.
  const now = Date.now();

  return (
    <main className="relative min-h-screen pb-10">
      <header className="border-b border-white/10 bg-[#0a0d12] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="PinHub home">
            <Image src="/pinhub-logo.png" alt="" width={48} height={48} priority />
            <div className="min-w-0">
              <span className="brand-title text-2xl text-white sm:text-3xl">PinHub</span>
              <p className="mt-0.5 text-xs text-zinc-400">From pin map to parts list.</p>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <div className="sticky top-0 z-30 border-b border-white/10 bg-[#0c0e13]">
        <div className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6 lg:px-8">
          <SectionNav current="/prices" />
          <span className="hidden font-mono text-xs text-zinc-400 sm:block">US listings / USD / quantity 1</span>
        </div>
      </div>
      <PricesApp listings={listings} now={now} />
    </main>
  );
}
