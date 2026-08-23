import type { Metadata } from "next";
import Link from "next/link";
import { boards } from "@/lib/boards";
import { AppHeader } from "@/components/shell/AppHeader";

export const metadata: Metadata = {
  title: "Board not found",
};

/**
 * A board id that is not in the catalog. The copy is specific about why: pin
 * maps are only published once they can be checked against a vendor document,
 * so a missing route means "not verified yet", not "lost".
 */
export default function NotFound() {
  return (
    <div className="panel-grain flex min-h-screen flex-col">
      <AppHeader section={null} />
      <main className="mx-auto grid w-full max-w-[1720px] flex-1 place-items-center px-4 py-8 sm:px-6">
        <section className="panel w-full max-w-lg p-5">
          <p className="silk">Error 404</p>
          <h1 className="readout mt-1.5 text-2xl uppercase text-ink">
            No board at this address
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-dim">
            This board id is not in the catalog. PinHub only publishes a pin map
            once it can be checked against official vendor documentation, so
            nothing is served from a guessed id.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Link href="/" className="ctl">
              Search {boards.length} boards
            </Link>
            <Link href="/compare" className="ctl">
              Compare boards
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
