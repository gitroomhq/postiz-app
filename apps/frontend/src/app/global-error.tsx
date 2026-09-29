'use client';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { useVariables } from '@gitroom/react/helpers/variable.context';

// postmonster: branded 500 (PRD 7.4) - a friendly page, never a stack trace
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
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          background: '#0E0F13',
          color: '#F6F4EE',
          fontFamily:
            "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            textAlign: 'center',
            padding: '24px',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-text.svg" alt="Postmonster" width={180} />
          <div style={{ fontSize: '20px', fontWeight: 600 }}>
            Something went wrong
          </div>
          <div style={{ opacity: 0.7, maxWidth: '420px' }}>
            We hit an unexpected error on this page. Your data is safe. Try
            refreshing, or come back in a moment.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '8px',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#C8F560',
              color: '#0E0F13',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Refresh the page
          </button>
          <a
            href="/dashboard"
            style={{
              opacity: 0.7,
              textDecoration: 'underline',
              color: '#F6F4EE',
            }}
          >
            Back to Dashboard
          </a>
        </div>
      </body>
    </html>
  );
}
