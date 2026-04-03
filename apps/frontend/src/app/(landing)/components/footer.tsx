import Link from 'next/link';
import Image from 'next/image';
import { FOOTER_COLS, TIKTOK_COMPLIANCE_LINKS } from '../data/landing';

export function Footer() {
  return (
    <footer className="bg-[#0E0E0E] border-t border-white/[0.08] pt-16 pb-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Top grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="BB Post" width={28} height={28} className="rounded-md" />
              <span className="text-white font-bold">BB Post</span>
            </Link>
            <p className="text-xs text-white/40 leading-relaxed">
              Open-source social media scheduler for businesses and creators. Schedule, automate, and grow across 19+ platforms.
            </p>
            <Link
              href="https://github.com/BusinessBuilders/BB-Post"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors inline-flex"
            >
              ⭐ 27,800+ Stars
            </Link>
          </div>

          {FOOTER_COLS.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">{col.title}</h3>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      target={link.href.startsWith('http') ? '_blank' : undefined}
                      rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="text-sm text-white/55 hover:text-white transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* TikTok compliance notice */}
        <div className="border border-white/[0.05] bg-white/[0.02] rounded-xl px-5 py-4 mb-8">
          <p className="text-xs text-white/35 leading-relaxed">
            By connecting TikTok to BB Post, you agree to TikTok&apos;s platform policies. See our{' '}
            {TIKTOK_COMPLIANCE_LINKS.map((link, i) => (
              <span key={link.label}>
                <Link href={link.href} className="text-white/55 hover:text-white underline underline-offset-2 transition-colors">
                  {link.label}
                </Link>
                {i < TIKTOK_COMPLIANCE_LINKS.length - 1 ? ' · ' : '.'}
              </span>
            ))}
          </p>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.05]">
          <p className="text-xs text-white/30">
            © 2026 BB Post. Open source under AGPL v3. Built on{' '}
            <Link href="https://github.com/gitroomhq/postiz-app" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors">
              Postiz
            </Link>{' '}
            — the #1 open-source social scheduler.
          </p>
          <div className="flex items-center gap-4">
            <Link href="https://github.com/BusinessBuilders/BB-Post" target="_blank" rel="noopener noreferrer" className="text-xs text-white/30 hover:text-white transition-colors">GitHub</Link>
            <Link href="https://discord.gg/postiz" target="_blank" rel="noopener noreferrer" className="text-xs text-white/30 hover:text-white transition-colors">Discord</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
