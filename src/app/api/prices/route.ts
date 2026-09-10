import { getLivePrices } from "@/lib/server/price-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getLivePrices();
  return Response.json(data, { headers: {
    "Cache-Control": data.source === "shared" ? "public, max-age=0, s-maxage=30" : "no-store",
    "X-Content-Type-Options": "nosniff",
  } });
}
