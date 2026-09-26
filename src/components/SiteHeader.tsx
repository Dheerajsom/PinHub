import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { clsx } from "clsx";
import { SectionNav } from "@/components/SectionNav";
import { ThemeToggle } from "@/components/ThemeToggle";

type SiteHeaderProps = {
  /** Section to mark as current in the nav, e.g. "/" or "/compare". */
  current?: string;
  /** Max content width, matching the page body below the header. */
  width?: "narrow" | "default" | "wide";
  /** Optional page-specific control placed before the theme toggle. */
  actions?: ReactNode;
};

const widths = {
  narrow: "max-w-[860px]",
  default: "max-w-[1280px]",
  wide: "max-w-[1560px]",
} as const;

/**
 * The header every secondary page wears: the brand (which is the way home),
 * the three section links, and the theme toggle. Board, comparison, shared
 * collection, privacy, and error pages each used to hand-roll their own, which
 * left most of them with no route to Compare or Prices and two with a "Back to
 * discovery" link that actually went to the catalog.
 */
export function SiteHeader({ current = "", width = "default", actions }: SiteHeaderProps) {
  return (
    <header className="ph-site-header relative border-b border-white/10 bg-[#0a0d12] pt-[env(safe-area-inset-top)]">
      <div
        className={clsx(
          "mx-auto flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-8",
          widths[width],
        )}
      >
        <Link
          href="/"
          aria-label="PinHub catalog home"
          className="group flex min-h-10 shrink-0 items-center gap-2 rounded-lg"
        >
          <Image
            src="/pinhub-logo.png"
            alt=""
            width={28}
            height={28}
            className="rounded-md transition group-hover:scale-105"
          />
          <span className="brand-title text-xl leading-none text-white">PinHub</span>
        </Link>
        {/* Below sm the nav takes its own full-width row so all three
            sections stay tappable at 360 px without crowding the brand. */}
        <SectionNav
          current={current}
          className="max-sm:order-last max-sm:w-full max-sm:justify-between"
        />
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {actions}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
