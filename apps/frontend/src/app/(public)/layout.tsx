import '../global.scss';
import { ReactNode } from 'react';
import { Archivo } from 'next/font/google';
import Link from 'next/link';

const jakartaSans = Archivo({
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  style: ['normal'],
  subsets: ['latin'],
});

// Root layout for public pages (/, /privacy, /terms).
// Lives in its own route group so it is independent from the (app)
// authenticated UI and stays accessible without login.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" sizes="any" />
      </head>
      <body
        className={`${jakartaSans.className} dark text-white bg-lamboBlack min-h-screen flex flex-col`}
      >
        {/* Header */}
        <header className="border-b border-lamboCharcoal">
          <div className="max-w-[1200px] mx-auto px-[24px] md:px-[40px] py-[20px] flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-[8px] select-none hover:opacity-90 transition-opacity font-lambo uppercase"
            >
              <span className="text-[22px] leading-none tracking-tight text-lamboGold">
                D3
              </span>
              <span className="text-[22px] leading-none tracking-tight text-white">
                Creator
              </span>
            </Link>
            <nav className="flex items-center gap-[20px] sm:gap-[28px] text-[14px] uppercase tracking-[0.14px]">
              <Link
                href="/dashboard"
                className="text-[#c8c8c8] hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/leaderboard"
                className="text-[#c8c8c8] hover:text-white transition-colors"
              >
                Leaderboard
              </Link>
              <Link
                href="/admin"
                className="lambo-micro text-[#696868] hover:text-[#9c9c9c] transition-colors"
              >
                Admin
              </Link>
            </nav>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 w-full">
          <div className="max-w-[1200px] mx-auto px-[24px] md:px-[40px] py-[48px] md:py-[56px]">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-lamboCharcoal mt-[48px]">
          <div className="max-w-[1200px] mx-auto px-[24px] md:px-[40px] py-[24px] flex flex-col md:flex-row items-center justify-between gap-[12px] text-[13px] text-lamboAsh">
            <div className="lambo-micro text-lamboAsh">© 2025 D3 Creator. All rights reserved.</div>
            <div className="flex items-center gap-[20px] uppercase tracking-[0.14px]">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
