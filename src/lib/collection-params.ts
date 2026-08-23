import type { LocalBoardCollection } from "@/lib/personal-library";

const maxSharedBoards = 24;
const maxValueLength = 2_048;

export function parseSharedCollectionIds(
  value: string | string[] | undefined,
): string[] {
  const joined = (Array.isArray(value) ? value : [value ?? ""])
    .slice(0, maxSharedBoards)
    .map((part) => part.slice(0, maxValueLength));
  return [...new Set(joined.flatMap((part) => part.split(",")).filter(Boolean))].slice(
    0,
    maxSharedBoards,
  );
}

export function collectionSharePath(
  collection: Pick<LocalBoardCollection, "name" | "boardIds">,
): string {
  const params = new URLSearchParams();
  params.set("name", collection.name);
  params.set("boards", collection.boardIds.join(","));
  return `/collections?${params.toString()}`;
}

