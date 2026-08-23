import Link from "next/link";
import { clsx } from "clsx";
import { ThemeToggle } from "@/components/ThemeToggle";

export type ShellSection = "index" | "compare" | "saved" | null;

const repoUrl = "https://github.com/Dheerajsom/PinHub";

const sections: { id: Exclude<ShellSection, null>; label: string; href: string }[] =
  [
    { id: "index", label: "Index", href: "/" },
    { id: "compare", label: "Compare", href: "/compare" },
    { id: "saved", label: "Saved", href: "/collections" },
  ];

type AppHeaderProps = {
  /** Which nav entry is current, so every page can answer "where am I?". */
  section: ShellSection;
  /**
   * The board or view being worked on, shown to the right of the wordmark the
   * way a front panel prints the channel currently selected.
   */
  context?: string;
  /** Small right-aligned readings: board count, source count, match count. */
  readings?: { label: string; value: string }[];
};

/**
 * The instrument's top fascia. Identical on every route so the shell never
 * shifts under the user: wordmark, current context, section switch, readings.
 */
export function AppHeader({ section, context, readings = [] }: AppHeaderProps) {
  return (
    <header className="relative z-30 border-b border-rule bg-face pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-[1720px] items-center gap-x-2 px-3 py-1.5 sm:gap-x-4 sm:px-6 sm:py-2">
        <Link
          href="/"
          className="flex shrink-0 items-baseline gap-2"
          aria-label="PinHub home"
        >
          <span className="readout text-[1.2rem] uppercase tracking-[0.06em] text-ink sm:text-[1.35rem]">
            PinHub
          </span>
          <span className="silk hidden lg:inline">Pinout reference</span>
        </Link>

        {context ? (
          <>
            <span className="hidden h-4 w-px shrink-0 bg-rule-strong sm:block" />
            <span className="readout hidden min-w-0 truncate text-base uppercase text-dim sm:block">
              {context}
            </span>
          </>
        ) : null}

        <nav
          aria-label="Sections"
          className="ml-auto flex shrink-0 items-center border border-rule"
        >
          {sections.map((entry) => {
            const current = entry.id === section;
            return (
              <Link
                key={entry.id}
                href={entry.href}
                aria-current={current ? "page" : undefined}
                className={clsx(
                  "silk px-2 py-2 transition-colors sm:px-2.5",
                  current
                    ? "bg-raised text-ink"
                    : "text-faint hover:bg-raised hover:text-ink",
                )}
              >
                {entry.label}
              </Link>
            );
          })}
        </nav>

        {readings.length ? (
          <dl className="hidden shrink-0 items-center gap-4 md:flex">
            {readings.map((reading) => (
              <div key={reading.label} className="flex flex-col-reverse">
                <dt className="silk">{reading.label}</dt>
                <dd className="data text-sm font-medium leading-none text-ink">
                  {reading.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View PinHub source on GitHub (opens in a new tab)"
            title="View source on GitHub"
            className="ctl aspect-square !px-0"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
