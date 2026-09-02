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
    <nav aria-label="PinHub sections" className={clsx("flex w-fit shrink-0 items-center rounded-lg border border-white/10 bg-[#090b10] p-1", className)}>
      {sections.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} aria-current={current === href ? "page" : undefined}
          className={clsx("inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition", current === href
            ? "bg-cyan-300/12 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(103,232,249,0.25)]"
            : href === "/prices" ? "text-amber-200 hover:bg-amber-300/10" : "text-zinc-400 hover:bg-white/[0.05] hover:text-white")}>
          <Icon className="size-3.5" aria-hidden="true" />{label}
        </Link>
      ))}
    </nav>
  );
}
