import Script from 'next/script';
import { SentryConfigService } from '@gitroom/helpers/sentry/sentry.config';

export function SentryScript() {
  const config = SentryConfigService.getConfig();
  
  if (!config.enabled) {
    return null;
  }

  // Create the script content that will inject Sentry config into window
  const scriptContent = `
    window.__SENTRY_ENABLED__ = ${JSON.stringify(config.enabled)};
    window.__SENTRY_DSN__ = ${JSON.stringify(config.dsn)};
    window.__SENTRY_ENVIRONMENT__ = ${JSON.stringify(config.environment)};
    window.__SENTRY_DEBUG__ = ${JSON.stringify(config.debug)};
    window.__SENTRY_TRACES_SAMPLE_RATE__ = ${JSON.stringify(config.tracesSampleRate)};
    window.__SENTRY_REPLAYS_SESSION_SAMPLE_RATE__ = ${JSON.stringify(config.replaysSessionSampleRate)};
    window.__SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE__ = ${JSON.stringify(config.replaysOnErrorSampleRate)};
    
    console.log('[Frontend] Sentry config injected:', {
      enabled: window.__SENTRY_ENABLED__,
      environment: window.__SENTRY_ENVIRONMENT__,
      replaysSessionSampleRate: window.__SENTRY_REPLAYS_SESSION_SAMPLE_RATE__,
      replaysOnErrorSampleRate: window.__SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE__
    });
  `;

  return (
    <Script
      id="sentry-config"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: scriptContent,
      }}
    />
  );
}
