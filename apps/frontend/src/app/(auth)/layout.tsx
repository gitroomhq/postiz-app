import '../global.scss';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in — D3 Creator',
};

// Auth route group has its own html/body so the AuthShell can take the full
// viewport without inheriting (public)'s header/footer chrome.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/d3-logo.png?v=3" type="image/png" />
        <meta name="darkreader-lock" />
      </head>
      <body className="dark bg-canvas text-fg font-sans antialiased">{children}</body>
    </html>
  );
}
