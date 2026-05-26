import '../global.scss';
import { ReactNode } from 'react';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAdmin } from './is-admin';

const jakartaSans = Plus_Jakarta_Sans({
  weight: ['400', '500', '600', '700', '800'],
  style: ['normal'],
  subsets: ['latin'],
});

// Admin shell. Sits next to the public (public/) layout — different chrome,
// different nav. Auth gating is enforced upstream in proxy.ts. Sessions are
// 1-hour idle; cookie is re-stamped on every authenticated /admin/* request.
//
// Defense-in-depth: even if the proxy ever fails open, this layout re-checks
// the auth cookie server-side and bounces to the login page before rendering
// any admin chrome.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!(await isAdmin())) {
    redirect('/auth/login');
  }

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" sizes="any" />
      </head>
      <body
        className={`${jakartaSans.className} dark text-white bg-[#0E0E0E] min-h-screen flex flex-col`}
      >
        <header className="border-b border-[#252525]">
          <div className="max-w-[1080px] mx-auto px-[24px] py-[16px] flex items-center justify-between">
            <Link
              href="/admin"
              className="flex items-center gap-[8px] select-none hover:opacity-90 transition-opacity"
            >
              <span className="font-bold text-[20px] leading-none tracking-tight text-[#1D4ED8]">
                D3
              </span>
              <span className="font-bold text-[20px] leading-none tracking-tight text-white">
                Creator
              </span>
              <span className="ml-[10px] px-[8px] py-[3px] rounded-full bg-[#1D4ED8]/15 text-[#60A5FA] text-[10px] font-semibold uppercase tracking-[1.5px]">
                Admin
              </span>
            </Link>
            <nav className="flex items-center gap-[20px] text-[14px]">
              <Link
                href="/admin"
                className="text-[#c8c8c8] hover:text-white font-semibold transition-colors"
              >
                Creators
              </Link>
              <Link
                href="/"
                className="text-[12px] text-[#696868] hover:text-[#9c9c9c] transition-colors uppercase tracking-[1px]"
              >
                View Site
              </Link>
              <Link
                href="/auth/logout"
                className="text-[12px] text-[#696868] hover:text-[#9c9c9c] transition-colors uppercase tracking-[1px]"
              >
                Logout
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 w-full">
          <div className="max-w-[1080px] mx-auto px-[24px] py-[40px] md:py-[56px]">
            {children}
          </div>
        </main>

        <footer className="border-t border-[#252525] mt-[48px]">
          <div className="max-w-[1080px] mx-auto px-[24px] py-[16px] text-[12px] text-[#696868] text-center uppercase tracking-[1px]">
            D3 Creator — Admin Console
          </div>
        </footer>
      </body>
    </html>
  );
}
