'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({ error }: { error: Error }) {
  useEffect(() => {
    const eventId = Sentry.captureException(error);
    Sentry.showReportDialog({
      eventId,
      title: "Something broke!",
      subtitle: "Please help us fix the issue by providing some details.",
      labelComments: "What happened?",
      labelName: "Your name",
      labelEmail: "Your email",
      labelSubmit: "Send Report",
      lang: "en",
    });
  }, [error]);

  return (
    <html>
      <body>
        <h2>Something went wrong</h2>
        <p>{error.message}</p>
      </body>
    </html>
  );
}