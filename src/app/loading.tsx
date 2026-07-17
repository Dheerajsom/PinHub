import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#080a0e] px-6 text-zinc-100">
      <div className="flex items-center gap-3" role="status" aria-live="polite">
        <LoaderCircle className="size-5 animate-spin text-cyan-300" aria-hidden="true" />
        <span className="text-sm text-zinc-300">Loading source-backed pinouts…</span>
      </div>
    </main>
  );
}
