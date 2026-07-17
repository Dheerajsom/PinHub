import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { boards } from "@/lib/boards";
import { PinoutFullView } from "@/components/board-visual/PinoutFullView";
import { siteName } from "@/lib/site";

// This catalog is fully static; reject unknown IDs instead of rendering them
// on demand at runtime.
export const dynamicParams = false;

export function generateStaticParams() {
  return boards.map((board) => ({ id: board.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const board = boards.find((b) => b.id === id);
  if (!board) return { title: "Pinout not found" };
  const title = `${board.name} pinout`;
  const description = `Interactive, source-backed connector pinout for the ${board.name}.`;
  return {
    title,
    description,
    alternates: {
      canonical: `/pinout/${board.id}`,
    },
    openGraph: {
      type: "website",
      url: `/pinout/${board.id}`,
      siteName,
      title: `${title} · ${siteName}`,
      description,
    },
    twitter: {
      card: "summary",
      title: `${title} · ${siteName}`,
      description,
    },
  };
}

export default async function PinoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const board = boards.find((b) => b.id === id);
  if (!board) notFound();
  return <PinoutFullView board={board} />;
}
