'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Docs', href: 'https://docs.postiz.com', external: true },
  { label: 'GitHub', href: 'https://github.com/BusinessBuilders/BB-Post', external: true },
] as const;

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0E0E0E]/95 backdrop-blur-md border-b border-white/[0.08]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/logo.png" alt="BB Post" width={32} height={32} priority className="rounded-md" />
          <span className="text-white font-bold text-lg">BB Post</span>
        </Link>

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              target={'external' in link ? '_blank' : undefined}
              rel={'external' in link ? 'noopener noreferrer' : undefined}
              className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-200"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all duration-200 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]"
          >
            Start Free →
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          className="md:hidden p-1 text-white/60 hover:text-white transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? (
              <>
                <line x1="4" y1="4" x2="18" y2="18" />
                <line x1="18" y1="4" x2="4" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="19" y2="6" />
                <line x1="3" y1="11" x2="19" y2="11" />
                <line x1="3" y1="16" x2="19" y2="16" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="md:hidden bg-[#0E0E0E] border-t border-white/[0.08] px-6 py-5 flex flex-col gap-4"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                target={'external' in link ? '_blank' : undefined}
                rel={'external' in link ? 'noopener noreferrer' : undefined}
                className="text-sm font-medium text-white/60 hover:text-white transition-colors"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-white/10" />
            <Link
              href="/auth/login"
              className="text-sm font-medium text-white/60 hover:text-white transition-colors"
              onClick={() => setOpen(false)}
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-sm font-semibold px-5 py-3 rounded-lg transition-colors text-center"
              onClick={() => setOpen(false)}
            >
              Start Free →
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
