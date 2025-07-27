// Sentry client configuration for Next.js
import { SentryConfigService } from '@gitroom/helpers/sentry/sentry.config';

// Create a client-compatible config that reads from environment variables
export const getClientSentryConfig = () => {
  // Use client-accessible environment variables
  const enabled = typeof window !== 'undefined' 
    ? (window as any).__SENTRY_ENABLED__ === 'true'
    : process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true';
    
  const dsn = typeof window !== 'undefined' 
    ? (window as any).__SENTRY_DSN__
    : process.env.NEXT_PUBLIC_SENTRY_DSN;

  return {
    enabled: enabled && !!dsn,
    dsn: dsn || '',
    environment: process.env.NODE_ENV || 'development',
    debug: process.env.NEXT_PUBLIC_SENTRY_DEBUG === 'true',
    release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    replaysSessionSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE || '0.1'),
    replaysOnErrorSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE || '1.0'),
  };
};

// Server-side config using the main config service
export const getServerSentryConfig = () => {
  return SentryConfigService.getConfig();
};
