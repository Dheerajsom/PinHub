import Link from "next/link";
import { CircuitBoard, GitCompareArrows, Tags } from "lucide-react";
import { clsx } from "clsx";

const sections = [
  { href: "/", label: "Pin Maps", icon: CircuitBoard },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
  { href: "/prices", label: "Prices", icon: Tags },
] as const;

export function SectionNav({ current, className }: { current: string; className?: string }) {
  return (
    <nav aria-label="PinHub sections" className={clsx("flex w-fit shrink-0 items-center gap-1", className)}>
      {sections.map(({ href, label, icon: Icon }) => {
        const active = current === href;
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={clsx("inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition",
              active
                ? "bg-cyan-300/12 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.35)]"
                : href === "/prices"
                  ? "text-amber-200/90 hover:bg-amber-300/10 hover:text-amber-100"
                  : "text-zinc-500 hover:bg-white/[0.06] hover:text-white")}>
            <Icon className="size-3.5" aria-hidden="true" />{label}
          </Link>
        );
      })}
    </nav>
  );
}
