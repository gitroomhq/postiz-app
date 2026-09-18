'use client';
import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';
import { useEffect } from 'react';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    // The variables context is not mounted here (this replaces the root
    // layout), so don't gate on its DSN. Without a client this is a no-op, and
    // beforeSend already opens the report dialog for captured exceptions
    Sentry.captureException(error);
  }, [error]);
  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
