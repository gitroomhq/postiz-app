'use client';
import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';
import { useEffect } from 'react';
import { useVariables } from '@gitroom/react/helpers/variable.context';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const { sentryDsn } = useVariables();

  useEffect(() => {
    if (!sentryDsn) {
      return;
    }
    const eventId = Sentry.captureException(error);
    Sentry.showReportDialog({
      eventId,
      title: 'Something broke!',
      subtitle: 'Please help us fix the issue by providing some details.',
      labelComments: 'What happened?',
      labelName: 'Your name',
      labelEmail: 'Your email',
      labelSubmit: 'Send Report',
      lang: 'en',
    });

  }, [error]);
  return (
    <html>
      <body style={{ margin: 0, background: '#0d0d0d', color: '#e5e5e5', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ maxWidth: 560, textAlign: 'center', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Postiz encountered an unexpected error</div>
          {error?.message && (
            <div style={{ fontSize: 13, fontFamily: 'monospace', background: '#1a1a1a', borderRadius: 8, padding: 12, width: '100%', textAlign: 'left', wordBreak: 'break-all', color: '#aaa' }}>
              {error.message}
            </div>
          )}
          <button
            style={{ marginTop: 8, padding: '10px 24px', background: '#612bd3', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            onClick={() => { window.location.href = '/launches'; }}
          >
            Go to Launches
          </button>
          <button
            style={{ padding: '10px 24px', background: '#1a1a1a', color: '#e5e5e5', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
