import '../global.scss';
import { ReactNode } from 'react';
import Link from 'next/link';
import { getAuthContext } from '@gitroom/frontend/lib/auth';
import { SignOutButton } from '@gitroom/frontend/components/auth/signout-button';
import { Footer } from '@gitroom/frontend/components/ui/footer';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const auth = await getAuthContext();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/d3-logo.png?v=3" type="image/png" />
        <link rel="apple-touch-icon" href="/d3-logo.png?v=3" />
        {/* Page is already dark — tell Dark Reader to skip it so it doesn't
            inject data-darkreader-* attrs pre-hydration and cause mismatch */}
        <meta name="darkreader-lock" />
      </head>
      <body className="dark text-fg bg-canvas min-h-screen flex flex-col font-sans">
        {/* Header — quiet, full-bleed underline */}
        <header className="sticky top-0 z-50 border-b border-borderGlass bg-canvas">
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
                href="/about"
                className="px-3 py-1.5 rounded-md text-fgMuted hover:text-fg hover:bg-white/[0.04] transition-colors"
              >
                About
              </Link>
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
              {auth ? (
                <>
                  <Link
                    href={auth.role === 'admin' ? '/admin' : '/me'}
                    className="px-3 py-1.5 rounded-md text-fg hover:bg-white/[0.04] transition-colors"
                  >
                    {auth.role === 'admin' ? 'Admin' : 'My data'}
                  </Link>
                  <SignOutButton />
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-3 py-1.5 rounded-md text-fgMuted hover:text-fg hover:bg-white/[0.04] transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="ml-1 inline-flex items-center px-3 py-1.5 rounded-md bg-aurora-cta text-brand-darker hover:bg-aurora-ctaHover transition-colors text-label font-medium"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>

        {/* Main content */}
        <main className="relative z-10 flex-1 w-full overflow-x-clip">
          <div className="max-w-[1200px] mx-auto px-6 md:px-8">
            {children}
          </div>
        </main>

        {/* Footer */}
        <div className="relative z-10 mt-12">
          <Footer
            logo={
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src="/d3-logo.png"
                alt=""
                width={28}
                height={28}
                suppressHydrationWarning
              />
            }
            brandName="D3 Creator"
            mainLinks={[
              { href: '/about', label: 'About' },
              { href: '/dashboard', label: 'Dashboard' },
              { href: '/leaderboard', label: 'Leaderboard' },
            ]}
            legalLinks={[
              { href: '/privacy', label: 'Privacy' },
              { href: '/terms', label: 'Terms' },
            ]}
            copyright={{
              text: '© 2025 D3 Creator',
              license: 'All rights reserved',
            }}
          />
        </div>
      </body>
    </html>
  );
}
