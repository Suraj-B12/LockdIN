/* =====================================================================
   LegalLayout — shared chrome for the legal surfaces (/privacy, /terms).
   Deliberately crisp and de-glowed: no orbs/gradients, just a hairline-ruled
   sticky header, a readable prose measure, and a quiet footer. Long-form
   policies live or die on legibility, so the body is constrained to a ~70ch
   measure with generous vertical rhythm.

   The page-local primitives (Lead, H2, H3, P, UL, A, etc.) are exported so
   Privacy.tsx and Terms.tsx render with identical typography and never need
   to repeat the Tailwind soup.
   ===================================================================== */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react";
import { Container } from "@/components/ui";
import { cn } from "@/lib/cn";

export interface LegalLayoutProps {
  /** Eyebrow label above the title, e.g. "Legal". */
  eyebrow: string;
  /** Page title, e.g. "Privacy Policy". */
  title: string;
  /** One-line standfirst under the title. */
  intro: ReactNode;
  /** ISO-ish display date, e.g. "14 June 2026". */
  lastUpdated: string;
  /** The sibling legal page to cross-link to in the footer. */
  sibling: { label: string; to: string };
  children: ReactNode;
}

export function LegalLayout({ eyebrow, title, intro, lastUpdated, sibling, children }: LegalLayoutProps) {
  return (
    <div className="relative min-h-[100dvh] bg-canvas">
      {/* Quiet sticky header — wordmark + a single "back" affordance. */}
      <header className="sticky top-0 z-nav border-b border-hairline/[0.06] bg-canvas/80 backdrop-blur-xl">
        <Container className="flex h-16 items-center justify-between">
          <Link
            to="/"
            className="font-display text-lg font-semibold tracking-tightest text-ink transition-opacity hover:opacity-80"
          >
            Lockd<span className="text-teal">IN</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft weight="bold" className="h-4 w-4" />
            Back to home
          </Link>
        </Container>
      </header>

      <main className="relative">
        <Container className="py-16 sm:py-24">
          <div className="mx-auto max-w-[70ch]">
            {/* Title block */}
            <p className="text-[11px] font-medium uppercase tracking-eyebrow text-teal-bright">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-balance font-display text-4xl tracking-tightest text-ink sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 text-pretty text-lg leading-relaxed text-ink-soft">{intro}</p>
            <p className="mt-4 font-mono text-xs uppercase tracking-wide text-ink-faint">
              Last updated: {lastUpdated}
            </p>

            <hr className="my-10 border-0 border-t border-hairline/[0.08]" />

            {/* Policy body */}
            <article className="space-y-10">{children}</article>

            {/* Footer cross-link */}
            <hr className="mt-16 border-0 border-t border-hairline/[0.08]" />
            <div className="mt-10 flex flex-col gap-4 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
              <p className="text-ink-faint">© 2026 LockdIN — built for people who show up.</p>
              <div className="flex items-center gap-6">
                <Link to={sibling.to} className="transition-colors hover:text-ink">
                  {sibling.label}
                </Link>
                <Link to="/" className="transition-colors hover:text-ink">
                  Home
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}

/* ----------------------------------------------------------------------
   Prose primitives — shared between Privacy and Terms so the typographic
   rhythm is defined exactly once. All constrained to the parent's 70ch.
   ---------------------------------------------------------------------- */

/** A numbered/titled top-level section. `id` enables in-page anchors. */
export function Sec({ id, title, children }: { id?: string; title: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="font-display text-2xl tracking-tight text-ink sm:text-[1.7rem]">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 className="mt-6 text-base font-semibold text-ink">{children}</h3>;
}

export function P({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[15px] leading-relaxed text-ink-soft", className)}>{children}</p>;
}

/** Quieter, smaller note (e.g. legal-basis annotations). */
export function Note({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-ink-muted">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="space-y-2.5 pl-1 text-[15px] leading-relaxed text-ink-soft">{children}</ul>
  );
}

export function LI({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-teal" />
      <span>{children}</span>
    </li>
  );
}

/** Strong inline label, e.g. a term being defined or a purpose name. */
export function Term({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-ink">{children}</strong>;
}

/** External link styled in teal (opens in a new tab, safe rel). */
export function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-teal underline decoration-teal/30 underline-offset-2 transition-colors hover:text-teal-bright hover:decoration-teal-bright/50"
    >
      {children}
    </a>
  );
}

/** A clearly-marked fill-in-later placeholder for legal counsel. */
export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] text-teal-bright">
      [{children}]
    </span>
  );
}

/** A defined-term table row pair used in "what we collect / why". */
export function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-hairline/[0.06] py-3 last:border-b-0 sm:grid-cols-[12rem_1fr] sm:gap-6">
      <div className="text-[15px] font-medium text-ink">{label}</div>
      <div className="text-[15px] leading-relaxed text-ink-muted">{children}</div>
    </div>
  );
}
