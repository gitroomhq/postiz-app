export interface SentryConfig {
  dsn: string;
  environment: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
  debug: boolean;
  enabled: boolean;
  release?: string;
  serverName?: string;
  beforeSend?: (event: any, hint: { originalException?: Error | unknown }) => any;
  integrations?: any[];
}

export class SentryConfigService {
  static getConfig(): SentryConfig {
    const enabled = process.env.SENTRY_ENABLED === 'true';
    const dsn = process.env.SENTRY_DSN || '';
    
    // If Sentry is disabled or no DSN, return disabled config
    if (!enabled || !dsn) {
      return {
        dsn: '',
        environment: 'development',
        tracesSampleRate: 0,
        profilesSampleRate: 0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        debug: false,
        enabled: false,
      };
    }

    return {
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || 'development',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
      replaysSessionSampleRate: parseFloat(process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE || '0.1'),
      replaysOnErrorSampleRate: parseFloat(process.env.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE || '1.0'),
      debug: process.env.SENTRY_DEBUG === 'true',
      enabled: true,
      release: process.env.npm_package_version || 'unknown',
      serverName: process.env.HOSTNAME || 'unknown',
    };
  }

  static isEnabled(): boolean {
    return this.getConfig().enabled;
  }

  static getEnvironment(): string {
    return this.getConfig().environment;
  }

  static getDsn(): string {
    return this.getConfig().dsn;
  }
}
