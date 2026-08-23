import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy & disclaimer",
  description:
    "What PinHub collects, what it doesn't, and the terms under which its pinout data is provided.",
  alternates: { canonical: "/privacy" },
};

const lastUpdated = "2026-07-24";
const repoUrl = "https://github.com/Dheerajsom/PinHub";

export default function PrivacyPage() {
  return (
    <main className="relative isolate min-h-screen pb-10">
      <header className="relative border-b border-rule bg-well px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[860px] items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-dim transition text-ink"
          >
            <ArrowLeft className="size-4" /> Back to discovery
          </Link>
          <Link href="/" className="readout text-xl text-ink">
            PinHub
          </Link>
        </div>
      </header>

      <div className="relative mx-auto max-w-[860px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-ink">
          <Shield className="size-4" /> Privacy & disclaimer
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-ink sm:text-4xl">
          What we collect, and what we don&apos;t
        </h1>
        <p className="mt-3 text-sm text-faint">Last updated {lastUpdated}</p>

        <div className="mt-8 space-y-5">
          <section className="panel rounded-[2px] p-5">
            <h2 className="text-lg font-semibold text-ink">No accounts, no server-side profile</h2>
            <p className="mt-2 text-sm leading-6 text-dim">
              PinHub is a static catalog. There is no sign-up, no login, and no
              database of personal information. Nothing you do while browsing
              boards or pinouts is tied to your identity on our servers.
            </p>
          </section>

          <section className="panel rounded-[2px] p-5">
            <h2 className="text-lg font-semibold text-ink">Favorites stay on your device</h2>
            <p className="mt-2 text-sm leading-6 text-dim">
              Starring a board saves its ID to your browser&apos;s{" "}
              <code className="rounded-[2px] bg-raised px-1 py-0.5 text-[13px] text-dim">
                localStorage
              </code>
              . It never leaves your browser, is never sent to PinHub, and is
              cleared if you clear your browser&apos;s site data.
            </p>
          </section>

          <section className="panel rounded-[2px] p-5">
            <h2 className="text-lg font-semibold text-ink">Analytics</h2>
            <p className="mt-2 text-sm leading-6 text-dim">
              When deployed on Vercel, PinHub uses Vercel Web Analytics for
              anonymous, aggregate page-view counts. It does not use cookies
              or track individuals across sites. See{" "}
              <a
                href="https://vercel.com/docs/analytics/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-ink"
              >
                Vercel&apos;s analytics privacy policy
              </a>{" "}
              for details.
            </p>
          </section>

          <section className="panel rounded-[2px] p-5">
            <h2 className="text-lg font-semibold text-ink">Third-party links</h2>
            <p className="mt-2 text-sm leading-6 text-dim">
              Source references, datasheets, and manuals link out to vendor
              and third-party sites. Those sites have their own privacy
              practices, which PinHub doesn&apos;t control.
            </p>
          </section>

          <section className="rounded-[2px] border border-hazard/55 bg-face p-5">
            <h2 className="text-lg font-semibold text-hazard-ink">
              Pinout data: reference only, no warranty
            </h2>
            <p className="mt-2 text-sm leading-6 text-hazard-ink">
              Pin maps, voltage levels, and wiring notes on PinHub are
              community-compiled from public datasheets, schematics, and
              vendor documentation. They are provided &ldquo;as is&rdquo; for
              reference, without warranty of accuracy or completeness. Board
              revisions, silkscreen changes, and transcription errors happen —
              always cross-check the linked official source before applying
              power or signals to real hardware.
            </p>
            <p className="mt-3 text-sm leading-6 text-hazard-ink">
              PinHub, its maintainer, and its contributors accept no
              liability for damage to hardware, data, or anything else
              resulting from use of this data. Use it at your own risk.
            </p>
          </section>

          <section className="panel rounded-[2px] p-5">
            <h2 className="text-lg font-semibold text-ink">Changes & contact</h2>
            <p className="mt-2 text-sm leading-6 text-dim">
              This page may be updated as the project changes; the date above
              reflects the last revision. Questions or corrections are welcome
              via{" "}
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-ink"
              >
                the GitHub repository
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
