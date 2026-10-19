import * as Sentry from '@sentry/nextjs';

export const initializeSentryBasic = (environment: string, dsn: string, extension: any) => {
  if (!dsn) {
    return;
  }

  const ignorePatterns = [
    /^Failed to fetch$/,
    /^Failed to fetch .*/i,
    /^Load failed$/i,
    /^Load failed .*/i,
    /^NetworkError when attempting to fetch resource\.$/i,
    /^NetworkError when attempting to fetch resource\. .*/i,
    /^Object captured as promise rejection with keys: code, message$/i,
    /^Called on script loaded before session recording is available$/i,
    /^Failed to connect to MetaMask$/i,
    /^MetaMask extension not found$/i,
    /^undefined is not an object \(evaluating '\w+\.progress'\)$/i,
    /^Cannot read properties of undefined \(reading 'progress'\)$/i,
  ];

  // Browser wallet extensions (Phantom, MetaMask, etc.) reject with a plain
  // { code, message } object instead of an Error when the user closes their popup.
  // Those rejections happen inside the extension's injected script, not in our code.
  const isWalletExtensionRejection = (exception: unknown) =>
    !!exception &&
    typeof exception === 'object' &&
    !(exception instanceof Error) &&
    'code' in exception &&
    'message' in exception;

  // Frameless rejections our code can never produce: every chrome.runtime.sendMessage
  // call we make passes a callback, so it never rejects with this message.
  const thirdPartyFramelessPatterns = [
    /^Could not establish connection\. Receiving end does not exist\.$/,
  ];

  // Sentry wraps timer and event listener callbacks, extensions' included, and the
  // wrapper lives in our bundle. Its location is recorded so it is not counted as ours.
  let sentryWrapperFrame = '';
  const frameKey = (frame: Sentry.StackFrame) =>
    `${(frame.filename || '').split('/_next/').pop()}:${frame.lineno}:${frame.colno}`;

  const isThirdPartyOnly = (event: Sentry.ErrorEvent) => {
    const values = event.exception?.values || [];
    return (
      values.length > 0 &&
      values.every((value) => {
        const frames = value.stacktrace?.frames || [];
        const wrapperIndex = frames.map(frameKey).lastIndexOf(sentryWrapperFrame);
        const callbackFrames = frames
          .slice(wrapperIndex + 1)
          .filter((frame) => frame.filename && (frame.lineno || frame.colno));
        if (!callbackFrames.length) {
          return thirdPartyFramelessPatterns.some((pattern) => pattern.test(value.value || ''));
        }
        return callbackFrames.every((frame) => !frame.filename!.includes('/_next/'));
      })
    );
  };

  try {
    Sentry.init({
      initialScope: {
        tags: {
          service: 'frontend',
          component: 'nextjs',
          replaysEnabled: 'true',
        },
        contexts: {
          app: {
            name: 'Postiz Frontend',
            version: process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0',
          },
        },
      },
      integrations: [
        Sentry.consoleLoggingIntegration({ levels: ['log', 'info', 'warn', 'error', 'debug', 'assert', 'trace'] }),
      ],
      environment: environment || 'development',
      spotlight: process.env.SENTRY_SPOTLIGHT === '1',
      dsn,
      sendDefaultPii: true,
      ...extension,
      debug: environment === 'development',
      tracesSampleRate: 0.1,

      beforeSend(event, hint) {
        if (isWalletExtensionRejection(hint?.originalException)) {
          return null; // Ignore the event
        }

        if (event.exception && event.exception.values) {
          for (const exception of event.exception.values) {
            if (exception.value) {
              for (const pattern of ignorePatterns) {
                if (pattern.test(exception.value)) {
                  return null; // Ignore the event
                }
              }
            }
          }

          if (typeof window !== 'undefined' && isThirdPartyOnly(event)) {
            event.tags = { ...event.tags, third_party_code: true };
          }

          // If there's an exception and an event id, present the user report dialog.
          if (event.event_id && !event.tags?.third_party_code) {
            // Only attempt to show the dialog in a browser environment.
            if (typeof window !== 'undefined' && window.document) {
              // Dynamically import the package that exports showReportDialog to avoid
              // bundler errors when this shared lib is used in non-browser builds.
              import('@sentry/react')
                .then((mod) => {
                  try {
                    mod.showReportDialog({ eventId: event.event_id });
                  } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('Sentry.showReportDialog failed:', err);
                  }
                })
                .catch((importErr) => {
                  // eslint-disable-next-line no-console
                  console.error('Failed to import @sentry/react for report dialog:', importErr);
                });
            }
          }
        }

        return event; // Send the event to Sentry
      },
    });

    if (typeof window !== 'undefined') {
      const probe = new EventTarget();
      probe.addEventListener('probe', () => {
        const frames = Sentry.defaultStackParser(new Error().stack || '');
        const frame = frames[frames.length - 2];
        sentryWrapperFrame = frame ? frameKey(frame) : '';
      });
      probe.dispatchEvent(new Event('probe'));
    }
  } catch (err) {
    // Log initialization errors
    // eslint-disable-next-line no-console
    console.error('Sentry.init failed:', err);
  }
};
