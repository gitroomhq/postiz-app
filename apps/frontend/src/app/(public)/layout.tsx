import '../global.scss';
import { ReactNode } from 'react';
import Link from 'next/link';

// Root layout for public pages (/, /privacy, /terms).
// Lives in its own route group so it is independent from the (app)
// authenticated UI and stays accessible without login.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/d3-logo.png?v=3" type="image/png" />
        <link rel="apple-touch-icon" href="/d3-logo.png?v=3" />
      </head>
      <body className="dark text-fg bg-canvas min-h-screen flex flex-col font-sans">
        {/* Header — quiet, full-bleed underline */}
        <header className="relative z-10 sticky top-0 border-b border-borderGlass bg-canvas/80 backdrop-blur">
          <div className="max-w-[1200px] mx-auto px-6 md:px-8 h-14 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 select-none hover:opacity-90 transition-opacity"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/d3-logo.png"
                alt="D3"
                width={28}
                height={28}
                suppressHydrationWarning
              />
              <span className="text-heading font-semibold tracking-[-0.02em] text-fg">
                D3 Creator
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-label">
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-md text-fgMuted hover:text-fg hover:bg-white/[0.04] transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/leaderboard"
                className="px-3 py-1.5 rounded-md text-fgMuted hover:text-fg hover:bg-white/[0.04] transition-colors"
              >
                Leaderboard
              </Link>
              <Link
                href="/admin"
                className="px-3 py-1.5 rounded-md text-fgSubtle hover:text-fg hover:bg-white/[0.04] transition-colors"
              >
                Admin
              </Link>
            </nav>
          </div>
        </header>

        {/* Main content */}
        <main className="relative z-10 flex-1 w-full">
          <div className="max-w-[1200px] mx-auto px-6 md:px-8">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 mt-24 border-t border-borderGlass">
          <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-caption text-fgSubtle">
            <div>© 2025 D3 Creator. All rights reserved.</div>
            <div className="flex items-center gap-4">
              <Link
                href="/privacy"
                className="hover:text-fg transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="hover:text-fg transition-colors"
              >
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
