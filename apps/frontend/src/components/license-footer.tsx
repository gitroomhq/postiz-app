// Modified by SocialStream on 2026-04-30
//
// AGPL-3.0 attribution footer required by CONTEXT.md decision D-05.
// Renders without JavaScript (server component — no 'use client' directive).
// Inline at the end of every page, not sticky (D-05).
// Both upstream and fork links open in new tab with noopener noreferrer (D-18).
// Footer text per CONTEXT D-17.

import React from 'react';

const FOOTER_TEXT = {
  en: {
    prefix: 'This service is built on',
    middle: '(AGPL-3.0). Source code:',
  },
  nl: {
    prefix: 'Deze dienst is gebouwd op',
    middle: '(AGPL-3.0). Broncode:',
  },
  fr: {
    prefix: 'Ce service est construit sur',
    middle: '(AGPL-3.0). Code source :',
  },
} as const;

type Language = keyof typeof FOOTER_TEXT;

export function LicenseFooter({ language = 'en' }: { language?: string }) {
  const lang: Language = (language in FOOTER_TEXT ? language : 'en') as Language;
  const t = FOOTER_TEXT[lang];

  return (
    <footer
      className="text-center text-[14px] font-normal py-3 px-4 opacity-60"
      style={{ borderTop: '1px solid rgba(127, 127, 127, 0.2)' }}
      data-testid="agpl-footer"
    >
      <p>
        {t.prefix}{' '}
        <a
          href="https://github.com/gitroomhq/postiz-app"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Postiz
        </a>{' '}
        {t.middle}{' '}
        <a
          href="https://github.com/SocialStream-SaaS/socialstream-app"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          github.com/SocialStream-SaaS/socialstream-app
        </a>
      </p>
    </footer>
  );
}
