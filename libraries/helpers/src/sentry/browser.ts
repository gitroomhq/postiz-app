// Export only browser-compatible Sentry
import { SentryNextService } from './sentry.nextjs';

// Export with aliases for compatibility
export { SentryNextService };
export const SentryClientService = SentryNextService;
