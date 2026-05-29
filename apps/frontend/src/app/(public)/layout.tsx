import '../global.scss';
import { ReactNode } from 'react';
import Link from 'next/link';
import { getAuthContext } from '@gitroom/frontend/lib/auth';
import { SignOutButton } from '@gitroom/frontend/components/auth/signout-button';
import { Footer } from '@gitroom/frontend/components/ui/footer';
import NavLink from '@gitroom/frontend/components/ui/nav-link';
import MobileNav from '@gitroom/frontend/components/ui/mobile-nav';

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
            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1 text-label">
              <NavLink href="/about">About</NavLink>
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/leaderboard">Leaderboard</NavLink>
              {auth ? (
                <>
                  <NavLink href={auth.role === 'admin' ? '/admin' : '/me'}>
                    {auth.role === 'admin' ? 'Admin' : 'My data'}
                  </NavLink>
                  <SignOutButton />
                </>
              ) : (
                <>
                  <NavLink href="/login">Sign in</NavLink>
                  <Link
                    href="/signup"
                    className="ml-1 inline-flex items-center px-3 py-1.5 rounded-md bg-aurora-cta text-brand-darker hover:bg-aurora-ctaHover transition-colors text-label font-medium"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile nav — keep primary CTA visible, links go in the hamburger */}
            <div className="flex md:hidden items-center gap-1 text-label">
              {auth ? (
                <SignOutButton />
              ) : (
                <Link
                  href="/signup"
                  className="inline-flex items-center px-3 py-1.5 rounded-md bg-aurora-cta text-brand-darker hover:bg-aurora-ctaHover transition-colors text-label font-medium"
                >
                  Sign up
                </Link>
              )}
              <MobileNav
                links={[
                  { href: '/about', label: 'About' },
                  { href: '/dashboard', label: 'Dashboard' },
                  { href: '/leaderboard', label: 'Leaderboard' },
                  ...(auth
                    ? [
                        {
                          href: auth.role === 'admin' ? '/admin' : '/me',
                          label: auth.role === 'admin' ? 'Admin' : 'My data',
                        },
                      ]
                    : [{ href: '/login', label: 'Sign in' }]),
                ]}
              />
            </div>
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
