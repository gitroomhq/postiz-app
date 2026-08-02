import { DM_Sans, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';

// One shared instance for every layout. This used to be declared separately in
// each of the three root layouts plus layout.component.tsx, which downloads and
// inlines the same family four times.
//
// The pairing matches the landing site (postqueen.ai): DM Sans for body copy,
// Plus Jakarta Sans for display. Weight 400 is what unstyled body text falls
// back to — it was never loaded, so every paragraph in the app was synthesised
// by the browser from the 500 weight.
export const dmSans = DM_Sans({
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const jakartaSans = Plus_Jakarta_Sans({
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

// The redesign's third family, for anything the reader is expected to copy
// rather than read: API keys, MCP config blocks, channel IDs, CLI commands.
// Those are rendered in the browser's default monospace today, which changes
// shape between platforms and makes a key hard to compare by eye.
export const jetBrainsMono = JetBrains_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

/**
 * Goes on <body>: publishes all three font variables (so `font-sans`,
 * `font-display` and `font-mono` resolve) and sets DM Sans as the inherited
 * base.
 */
export const fontClassName = `${dmSans.variable} ${jakartaSans.variable} ${jetBrainsMono.variable} ${dmSans.className}`;
