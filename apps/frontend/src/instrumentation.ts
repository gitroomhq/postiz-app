export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return;
  }
  try {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      await import('./sentry.server.config');
    }
    if (process.env.NEXT_RUNTIME === 'edge') {
      await import('./sentry.edge.config');
    }
  } catch {
    // Sentry initialization is optional; continue if it fails
  }
}
