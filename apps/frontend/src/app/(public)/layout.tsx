import '../global.scss';
import { ReactNode } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Link from 'next/link';

const jakartaSans = Plus_Jakarta_Sans({
  weight: ['400', '500', '600', '700', '800'],
  style: ['normal'],
  subsets: ['latin'],
});

// Root layout for public pages (/, /privacy, /terms).
// Lives in its own route group so it is independent from the (app)
// authenticated UI and stays accessible without login.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" sizes="any" />
      </head>
      <body
        className={`${jakartaSans.className} dark text-white bg-[#0E0E0E] min-h-screen flex flex-col`}
      >
        {/* Header */}
        <header className="border-b border-[#252525]">
          <div className="max-w-[920px] mx-auto px-[24px] py-[20px] flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-[8px] select-none hover:opacity-90 transition-opacity"
            >
              <span className="font-bold text-[22px] leading-none tracking-tight text-[#1D4ED8]">
                D3
              </span>
              <span className="font-bold text-[22px] leading-none tracking-tight text-white">
                Analytics
              </span>
            </Link>
            <nav className="flex items-center gap-[24px] text-[14px] text-[#9c9c9c]">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="/auth/login" className="hover:text-white transition-colors">
                Login
              </Link>
            </nav>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 w-full">
          <div className="max-w-[920px] mx-auto px-[24px] py-[48px] md:py-[64px]">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-[#252525] mt-[48px]">
          <div className="max-w-[920px] mx-auto px-[24px] py-[24px] flex flex-col md:flex-row items-center justify-between gap-[12px] text-[13px] text-[#9c9c9c]">
            <div>© 2025 D3 Analytics. All rights reserved.</div>
            <div className="flex items-center gap-[20px]">
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
