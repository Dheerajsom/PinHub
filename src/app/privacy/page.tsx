import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { CircuitBackground } from "@/components/CircuitBackground";

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
      <CircuitBackground />
      <header className="relative border-b border-white/10 bg-[#0a0d12] px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[860px] items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-cyan-200"
          >
            <ArrowLeft className="size-4" /> Back to discovery
          </Link>
          <Link href="/" className="brand-title text-xl text-white">
            PinHub
          </Link>
        </div>
      </header>

      <div className="relative mx-auto max-w-[860px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200">
          <Shield className="size-4" /> Privacy & disclaimer
        </div>
        <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
          What we collect, and what we don&apos;t
        </h1>
        <p className="mt-3 text-sm text-zinc-500">Last updated {lastUpdated}</p>

        <div className="mt-8 space-y-5">
          <section className="surface-panel rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white">No accounts, no server-side profile</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              PinHub is a static catalog. There is no sign-up, no login, and no
              database of personal information. Nothing you do while browsing
              boards or pinouts is tied to your identity on our servers.
            </p>
          </section>

          <section className="surface-panel rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white">Favorites stay on your device</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Starring a board saves its ID to your browser&apos;s{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 text-[13px] text-zinc-300">
                localStorage
              </code>
              . It never leaves your browser, is never sent to PinHub, and is
              cleared if you clear your browser&apos;s site data.
            </p>
          </section>

          <section className="surface-panel rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white">Analytics</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              When deployed on Vercel, PinHub uses Vercel Web Analytics for
              anonymous, aggregate page-view counts. It does not use cookies
              or track individuals across sites. See{" "}
              <a
                href="https://vercel.com/docs/analytics/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-white"
              >
                Vercel&apos;s analytics privacy policy
              </a>{" "}
              for details.
            </p>
          </section>

          <section className="surface-panel rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white">Third-party links</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Source references, datasheets, and manuals link out to vendor
              and third-party sites. Those sites have their own privacy
              practices, which PinHub doesn&apos;t control.
            </p>
          </section>

          <section className="rounded-xl border border-orange-300/30 bg-[#1b1410] p-5">
            <h2 className="text-lg font-semibold text-orange-100">
              Pinout data: reference only, no warranty
            </h2>
            <p className="mt-2 text-sm leading-6 text-orange-50/80">
              Pin maps, voltage levels, and wiring notes on PinHub are
              community-compiled from public datasheets, schematics, and
              vendor documentation. They are provided &ldquo;as is&rdquo; for
              reference, without warranty of accuracy or completeness. Board
              revisions, silkscreen changes, and transcription errors happen —
              always cross-check the linked official source before applying
              power or signals to real hardware.
            </p>
            <p className="mt-3 text-sm leading-6 text-orange-50/80">
              PinHub, its maintainer, and its contributors accept no
              liability for damage to hardware, data, or anything else
              resulting from use of this data. Use it at your own risk.
            </p>
          </section>

          <section className="surface-panel rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white">Changes & contact</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              This page may be updated as the project changes; the date above
              reflects the last revision. Questions or corrections are welcome
              via{" "}
              <a
                href={repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-white"
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
