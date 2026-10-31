import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { boards } from "@/lib/boards";
import { shareCardModel } from "@/lib/share-card";
import { BoardShareCard, shareCardSize } from "@/components/og/BoardShareCard";

// Link-preview images for /pinout/[id] and /boards/[id]. Both routes are
// prerendered for every catalog board at build time.

let logo: Promise<string> | undefined;
function logoDataUrl() {
  logo ??= readFile(join(process.cwd(), "public", "pinhub-logo.png")).then(
    (data) => `data:image/png;base64,${data.toString("base64")}`,
  );
  return logo;
}

export function shareImageParams() {
  return boards.map((board) => ({ id: board.id }));
}

export async function renderShareImage(id: string, kind: "Pinout" | "Board overview") {
  const board = boards.find((item) => item.id === id);
  if (!board) notFound();
  return new ImageResponse(
    <BoardShareCard model={shareCardModel(board)} logo={await logoDataUrl()} kind={kind} />,
    shareCardSize,
  );
}
