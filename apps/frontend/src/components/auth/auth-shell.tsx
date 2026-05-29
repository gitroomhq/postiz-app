import type { ReactNode } from 'react';
import Link from 'next/link';
import { FloatingPaths } from '@gitroom/frontend/components/ui/floating-paths';

interface AuthShellProps {
  children: ReactNode;
  // Visible eyebrow + heading shown above the right-panel form.
  eyebrow: string;
  heading: string;
  subheading?: string;
}

// Two-column auth layout: brand panel on the left (with FloatingPaths),
// form panel on the right. Used for /login, /signup, and /onboarding.
export function AuthShell({ children, eyebrow, heading, subheading }: AuthShellProps) {
  return (
    <div className="min-h-screen w-full grid lg:grid-cols-[1.05fr_1fr] bg-canvas text-fg">
      {/* Left: brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-borderGlass bg-glass-subtle p-12">
        <FloatingPaths position={1} />
        <div className="absolute inset-0 bg-gradient-to-b from-aurora-cta/[0.04] via-transparent to-canvas/80 pointer-events-none" />

        <Link
          href="/"
          className="relative z-10 flex items-center gap-2 select-none hover:opacity-90 transition-opacity"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/d3-logo.png" alt="D3" width={32} height={32} />
          <span className="text-heading font-semibold tracking-[-0.02em] text-fg">
            D3 Creator
          </span>
        </Link>

        <div className="relative z-10 max-w-md">
          <blockquote className="text-section text-fg leading-tight tracking-[-0.02em]">
            “D3 lets us watch every creator we manage in one place —
            no logins to platforms, no chasing screenshots.”
          </blockquote>
          <div className="mt-6 flex items-center gap-3 text-label text-fgMuted">
            <span className="size-8 rounded-full bg-aurora-cta/20 grid place-items-center text-aurora-cta font-semibold">
              D
            </span>
            <span>D3 Talent Academy team</span>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-caption text-fgSubtle">
          <span className="size-1.5 rounded-full bg-aurora-cta" />
          Live analytics · 5 platforms · daily snapshots
        </div>
      </aside>

      {/* Right: form panel */}
      <main className="relative flex flex-col justify-center px-6 sm:px-12 py-10">
        <div className="absolute top-6 left-6 lg:left-12">
          <Link
            href="/"
            className="text-caption text-fgMuted hover:text-fg transition-colors"
          >
            ← Home
          </Link>
        </div>

        {/* Mobile-only brand bar (the full brand panel is lg+ only). Kept to a
            logo + wordmark so it doesn't duplicate the form's eyebrow pill /
            heading that sit directly below. */}
        <div className="lg:hidden flex items-center gap-2 select-none mb-8 mt-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/d3-logo.png" alt="D3" width={28} height={28} />
          <span className="text-heading font-semibold tracking-[-0.02em] text-fg">
            D3 Creator
          </span>
        </div>

        <div className="mx-auto w-full max-w-[420px] space-y-8">
          <header className="space-y-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-subtle border border-borderGlass text-caption text-fgMuted">
              <span className="inline-block size-1.5 rounded-full bg-aurora-cta" />
              {eyebrow}
            </span>
            <h1 className="text-section text-fg tracking-[-0.02em]">{heading}</h1>
            {subheading && <p className="text-body text-fgMuted">{subheading}</p>}
          </header>

          {children}
        </div>
      </main>
    </div>
  );
}
