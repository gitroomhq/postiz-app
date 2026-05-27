import '../global.scss';
import { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAdmin } from './is-admin';

// Admin shell. Sits next to the public (public/) layout — different chrome,
// different nav. Auth gating is enforced upstream in proxy.ts. Defense-in-depth:
// even if the proxy fails open, this layout re-checks server-side.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await isAdmin())) {
    redirect('/auth/login');
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/d3-logo.png?v=3" type="image/png" />
        <link rel="apple-touch-icon" href="/d3-logo.png?v=3" />
      </head>
      <body className="dark text-fg bg-canvas min-h-screen flex flex-col font-sans">
        <header className="relative z-10 sticky top-0 border-b border-borderGlass bg-canvas/80 backdrop-blur">
          <div className="max-w-[1200px] mx-auto px-6 md:px-8 h-14 flex items-center justify-between">
            <Link
              href="/admin"
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
              <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded-md glass-subtle border border-borderGlass text-caption text-fgMuted">
                Admin
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-label">
              <Link
                href="/admin"
                className="px-3 py-1.5 rounded-md text-fg hover:bg-white/[0.04] transition-colors"
              >
                Creators
              </Link>
              <Link
                href="/"
                className="px-3 py-1.5 rounded-md text-fgMuted hover:text-fg hover:bg-white/[0.04] transition-colors"
              >
                View Site
              </Link>
              <Link
                href="/auth/logout"
                className="px-3 py-1.5 rounded-md text-fgMuted hover:text-fg hover:bg-white/[0.04] transition-colors"
              >
                Logout
              </Link>
            </nav>
          </div>
        </header>

        <main className="relative z-10 flex-1 w-full">
          <div className="max-w-[1200px] mx-auto px-6 md:px-8">{children}</div>
        </main>

        <footer className="relative z-10 mt-24 border-t border-borderGlass">
          <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-8 text-caption text-fgSubtle text-center">
            D3 Creator — Admin Console
          </div>
        </footer>
      </body>
    </html>
  );
}
