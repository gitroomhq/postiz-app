/**
 * BB Post Landing Page Layout
 *
 * Parallel root layout — this app has no app/layout.tsx, so each route group
 * defines its own <html><body> root. This layout is completely isolated from
 * the (app) layout (no sidebar, no auth providers, no app shell).
 *
 * Next.js 14 patterns used:
 * - export const metadata: Metadata  (static, no generateMetadata needed)
 * - export const viewport: Viewport  (separate from metadata for streaming)
 * - next/font with variable weight   (single file, all weights, zero layout shift)
 */
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import '../global.scss';
import './landing.css';

// Variable font — single file covers weights 200–800, no layout shift
const jakartaSans = Plus_Jakarta_Sans({
  weight: 'variable',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BB Post — All your social media. One smart dashboard.',
  description:
    'BB Post is an open-source social media scheduler for businesses and creators. Schedule, automate, and analyze across 19+ platforms. Free to start.',
  keywords: [
    'social media scheduler',
    'open source',
    'TikTok scheduler',
    'Instagram scheduler',
    'LinkedIn scheduler',
    'social media automation',
    'content calendar',
  ],
  openGraph: {
    title: 'BB Post — All your social media. One smart dashboard.',
    description:
      'Open-source social media scheduler. 19+ platforms, AI content generation, workflow automation. Free plan available.',
    url: 'https://social.business-builder.online',
    siteName: 'BB Post',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BB Post — All your social media. One smart dashboard.',
    description:
      'Open-source social media scheduler. 19+ platforms, AI, automation. Free to start.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://social.business-builder.online',
  },
};

// Separate viewport export — required in Next.js 14 for streaming support
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0E0E0E',
};

export default function LandingLayout({ children }: { children: ReactNode }) {
  // `dark` class is required so shadcn/ui CSS variables (Button, Card, Badge, etc.)
  // resolve to their dark-mode values. Our bg/text use hardcoded hex, but shadcn
  // components use `bg-background`, `text-foreground`, etc. which need the dark class.
  return (
    <html lang="en" className={`${jakartaSans.className} dark`}>
      <body className="bg-[#0E0E0E] text-white antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
