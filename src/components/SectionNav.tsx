import Link from "next/link";
import { Cable, CircuitBoard, GitCompareArrows, Route, Tags } from "lucide-react";
import { clsx } from "clsx";

const sections = [
  { href: "/", label: "Pin Maps", icon: CircuitBoard },
  { href: "/planner", label: "Planner", icon: Route },
  { href: "/link", label: "Link", icon: Cable },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
  { href: "/prices", label: "Prices", icon: Tags },
] as const;

export function SectionNav({ current, className }: { current: string; className?: string }) {
  return (
    <nav aria-label="PinHub sections" className={clsx("flex w-fit shrink-0 items-center gap-1 max-[400px]:gap-0.5", className)}>
      {sections.map(({ href, label, icon: Icon }) => {
        const active = current === href;
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            // Five sections share one row down to 360 px: below 480 px the
            // icons give way to the labels, and below 400 px the padding
            // tightens. 44 px
            // tall at every width: a phone in landscape is wider than `sm`.
            className={clsx("inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-medium transition max-[400px]:px-2",
              active
                ? "bg-cyan-300/10 text-cyan-100 ring-1 ring-inset ring-cyan-300/35"
                : href === "/prices"
                  ? "ph-price-ink ph-price-nav"
                  : "text-zinc-500 hover:bg-white/[0.06] hover:text-white")}>
            <Icon className="size-3.5 max-[479px]:hidden" aria-hidden="true" />{label}
          </Link>
        );
      })}
    </nav>
  );
}
