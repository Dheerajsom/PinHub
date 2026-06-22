import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { boards } from "@/lib/boards";
import { PinoutFullView } from "@/components/board-visual/PinoutFullView";

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
  if (!board) return { title: "Pinout not found · PinHub" };
  return {
    title: `${board.name} pinout · PinHub`,
    description: `Interactive, source-backed connector pinout for the ${board.name}.`,
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
