import type { Metadata } from "next";
import { boards } from "@/lib/boards";
import { getLivePrices } from "@/lib/server/price-store";
import { PricesApp } from "@/components/PricesApp";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Board prices & availability",
  description: "Check dated USD prices, exact board variants, and retailer availability for popular boards in PinHub. Jump from a listing to its pinout.",
  alternates: { canonical: "/prices" },
};

export default async function PricesPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await searchParams;
  const data = await getLivePrices();
  const listings = data.snapshot.prices.map((price) => {
    const board = boards.find((item) => item.id === price.boardId);
    if (!board) throw new Error(`Price listing refers to missing board: ${price.boardId}`);
    return { ...price, name: board.name, vendor: board.vendor, category: board.category };
  });
  // This dynamic server route captures request time after awaiting searchParams.
  // eslint-disable-next-line react-hooks/purity -- Server-only freshness snapshot, serialized for hydration.
  const now = Date.now();

  return (
    <main className="relative min-h-screen pb-10">
      <SiteHeader current="/prices" width="wide" />
      <PricesApp listings={listings} now={now} initialSource={data.source} />
    </main>
  );
}
