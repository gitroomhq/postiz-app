import '../global.scss';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthContext } from '@gitroom/frontend/lib/auth';
import { SignOutButton } from '@gitroom/frontend/components/auth/signout-button';

// Creator-scoped layout. Middleware already enforces auth + onboarding gating;
// we re-fetch here so child server components can rely on the auth context.
export default async function CreatorLayout({ children }: { children: ReactNode }) {
  const auth = await getAuthContext();
  if (!auth) redirect('/login');

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/d3-logo.png?v=3" type="image/png" />
        <meta name="darkreader-lock" />
      </head>
      <body className="dark bg-canvas text-fg font-sans antialiased min-h-screen flex flex-col">
        <header className="sticky top-0 z-50 border-b border-borderGlass bg-canvas">
          <div className="max-w-[1200px] mx-auto px-6 md:px-8 h-14 flex items-center justify-between">
            <Link
              href="/me"
              className="flex items-center gap-2 select-none hover:opacity-90 transition-opacity"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/d3-logo.png" alt="D3" width={28} height={28} />
              <span className="text-heading font-semibold tracking-[-0.02em] text-fg">
                D3 Creator
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-label">
              <Link
                href="/me"
                className="px-3 py-1.5 rounded-md text-fgMuted hover:text-fg hover:bg-white/[0.04] transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/me/leaderboard"
                className="px-3 py-1.5 rounded-md text-fgMuted hover:text-fg hover:bg-white/[0.04] transition-colors"
              >
                Leaderboard
              </Link>
              {auth.role === 'admin' && (
                <Link
                  href="/admin"
                  className="px-3 py-1.5 rounded-md text-aurora-cta hover:bg-white/[0.04] transition-colors"
                >
                  Admin
                </Link>
              )}
              <span className="hidden sm:inline-block ml-3 text-caption text-fgSubtle">
                {auth.email}
              </span>
              <SignOutButton />
            </nav>
          </div>
        </header>

        <main className="relative z-10 flex-1 w-full">
          <div className="max-w-[1200px] mx-auto px-6 md:px-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
