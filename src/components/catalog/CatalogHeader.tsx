import Image from "next/image";
import { ThemeToggle } from "@/components/ThemeToggle";

const repoUrl = "https://github.com/Dheerajsom/PinHub";

type CatalogHeaderProps = {
  boardCount: number;
  interfaceCount: number;
  sourceCount: number;
};

export function CatalogHeader({
  boardCount,
  interfaceCount,
  sourceCount,
}: CatalogHeaderProps) {
  return (
    <header className="ph-header relative overflow-hidden pt-[env(safe-area-inset-top)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent"
        aria-hidden="true"
      />
      <div className="relative mx-auto flex max-w-[1560px] items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[#0e1118] shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] sm:size-14">
            <Image
              src="/pinhub-logo.png"
              alt=""
              fill
              sizes="(min-width: 640px) 56px, 48px"
              className="object-contain p-1"
              priority
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0">
            <h1 className="brand-title bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-2xl leading-none text-transparent sm:text-3xl">
              PinHub
            </h1>
            <p className="mt-1 truncate text-xs text-zinc-400 sm:text-[13px]">
              Source-backed pinouts for dev boards, SBCs, and microcontrollers
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5 sm:gap-5">
          <dl className="hidden items-center gap-2 text-sm md:flex">
            <Metric label="Boards" value={boardCount.toString()} />
            <Metric label="Interfaces" value={interfaceCount.toString()} />
            <Metric label="Sources" value={sourceCount.toString()} />
          </dl>
          <ThemeToggle />
          <GitHubButton />
        </div>
      </div>
    </header>
  );
}

function GitHubButton() {
  return (
    <a
      href={repoUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View PinHub source on GitHub (opens in a new tab)"
      title="View source on GitHub"
      className="ph-chrome-button group relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-xl px-2.5 text-sm font-medium text-zinc-200 transition hover:text-white active:scale-[0.97] sm:px-3"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5 shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:text-cyan-200"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
      <span className="relative hidden sm:inline">GitHub</span>
    </a>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-1.5 text-right transition hover:border-cyan-300/25">
      <dt className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </dt>
      <dd className="font-mono text-[15px] font-semibold leading-none tabular-nums text-white">
        {value}
      </dd>
    </div>
  );
}
