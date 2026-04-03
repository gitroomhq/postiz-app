/**
 * Footer — server component
 * Spec: Section 4 — 5-column grid with all 4 TikTok compliance links (required)
 *
 * TikTok compliance links are mandatory for TikTok API approval.
 * All 4 links must remain visible in the footer:
 * Privacy Policy, Terms of Service, Music Usage Confirmation, Branded Content Policy
 */
import Image from 'next/image';
import Link from 'next/link';
import { FOOTER_COLS, TIKTOK_COMPLIANCE_LINKS } from '../data/landing';

function FooterCol({
  title,
  links,
  className = '',
}: {
  title: string;
  links: ReadonlyArray<{ label: string; href: string }>;
  className?: string;
}) {
  return (
    <div className={className}>
      <h3 className="text-white font-semibold text-sm mb-4">{title}</h3>
      <ul className="space-y-3">
        {links.map(({ label, href }) => (
          <li key={label}>
            <Link
              href={href}
              className="text-gray-500 hover:text-gray-300 text-sm transition-colors duration-200"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-[#1A1919] border-t border-white/[0.08] py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image src="/logo.png" alt="BB Post" width={28} height={28} />
              <span className="text-white font-bold">BB Post</span>
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              Open-source social media scheduler. Built for businesses and
              creators who want real results.
            </p>
          </div>

          {/* Nav columns */}
          {FOOTER_COLS.slice(0, 3).map((col) => (
            <FooterCol key={col.title} title={col.title} links={col.links} />
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-white/[0.08] mb-8" />

        {/* Bottom row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <p className="text-gray-600 text-xs">
            © 2026 BB Post. Open source under{' '}
            <Link
              href="https://github.com/BusinessBuilders/BB-Post/blob/main/LICENSE"
              className="hover:text-gray-400 transition-colors underline"
            >
              AGPL v3
            </Link>
            . Built on Postiz.
          </p>

          {/* TikTok compliance links — REQUIRED for TikTok API approval */}
          <nav aria-label="Legal and compliance links">
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {TIKTOK_COMPLIANCE_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-xs text-gray-600 hover:text-gray-400 transition-colors duration-200"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* TikTok compliance note */}
        <p className="text-xs text-gray-700 mt-4 max-w-2xl leading-relaxed">
          By connecting TikTok to BB Post, you agree to TikTok's platform
          policies. See our{' '}
          <Link href="/music-usage-confirmation" className="underline hover:text-gray-600 transition-colors">
            Music Usage Confirmation
          </Link>{' '}
          and{' '}
          <Link href="/branded-content-policy" className="underline hover:text-gray-600 transition-colors">
            Branded Content Policy
          </Link>
          .
        </p>
      </div>
    </footer>
  );
}
