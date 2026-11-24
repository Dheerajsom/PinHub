import Link from "next/link";
import { CircuitBoard, GitCompareArrows, Tags } from "lucide-react";
import { clsx } from "clsx";
import { ToolsMenu } from "@/components/ToolsMenu";

// The three places to browse boards, then Tools for the workflows. Tools sits
// last so its list opens leftward from the row's end and stays on screen at
// 360 px, where the nav takes a full-width row of its own.
const sections = [
  { href: "/", label: "Pin Maps", icon: CircuitBoard },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
  { href: "/prices", label: "Prices", icon: Tags },
] as const;

export function SectionNav({ current, className }: { current: string; className?: string }) {
  return (
    <nav aria-label="PinHub sections" className={clsx("flex w-fit shrink-0 items-center gap-1 max-[440px]:gap-0.5", className)}>
      {sections.map(({ href, label, icon: Icon }) => {
        const active = current === href;
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            // Below 560 px the icons give way to the labels; 44 px tall at
            // every width, because a phone in landscape is wider than `sm`.
            className={clsx("inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-medium transition max-[440px]:px-2",
              active
                ? "bg-cyan-300/10 text-cyan-100 ring-1 ring-inset ring-cyan-300/35"
                : href === "/prices"
                  ? "ph-price-ink ph-price-nav"
                  : "ph-nav-link text-zinc-500")}>
            <Icon className="size-3.5 max-[559px]:hidden" aria-hidden="true" />{label}
          </Link>
        );
      })}
      <ToolsMenu current={current} />
    </nav>
  );
}
