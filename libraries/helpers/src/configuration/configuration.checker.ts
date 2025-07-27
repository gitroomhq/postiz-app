import { readFileSync, existsSync } from 'fs';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

export interface ConfigurationIssue {
  key: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

export class ConfigurationChecker {
  cfg: dotenv.DotenvParseOutput;
  issues: ConfigurationIssue[] = [];

  readEnvFromFile() {
    const envFile = resolve(__dirname, '../../../.env');

    if (!existsSync(envFile)) {
      console.error('Env file not found!: ', envFile);
      return;
    }

    const handle = readFileSync(envFile, 'utf-8');

    this.cfg = dotenv.parse(handle);
  }

  readEnvFromProcess() {
    this.cfg = process.env;
  }

  check() {
    this.checkCriticalSettings();
    this.checkDatabaseServers();
    this.checkSentryConfiguration();
    this.checkStorageConfiguration();
    this.checkEmailConfiguration();
    this.checkSocialMediaConfiguration();
    this.checkSecuritySettings();
  }

  private checkCriticalSettings() {
    this.checkNonEmpty('JWT_SECRET', 'error', 'Required for authentication', 'Generate a long random string (min 32 characters)');
    this.checkIsValidUrl('MAIN_URL', 'error');
    this.checkIsValidUrl('FRONTEND_URL', 'error');
    this.checkIsValidUrl('NEXT_PUBLIC_BACKEND_URL', 'error');
    this.checkIsValidUrl('BACKEND_INTERNAL_URL', 'error');
    this.checkNonEmpty('STORAGE_PROVIDER', 'error', 'Needed to setup storage.', 'Set to "local" or "cloudflare"');
  }

  private checkSentryConfiguration() {
    const sentryEnabled = this.get('SENTRY_ENABLED') === 'true';
    
    if (sentryEnabled) {
      this.checkNonEmpty('SENTRY_DSN', 'error', 'Required when Sentry is enabled', 'Get DSN from your Sentry project settings');
      this.checkNonEmpty('SENTRY_ENVIRONMENT', 'warning', 'Recommended for environment tracking', 'Set to "development", "staging", or "production"');
      
      // Check sample rates are valid numbers
      const tracesSampleRate = this.get('SENTRY_TRACES_SAMPLE_RATE');
      if (tracesSampleRate && (isNaN(Number(tracesSampleRate)) || Number(tracesSampleRate) < 0 || Number(tracesSampleRate) > 1)) {
        this.addIssue('SENTRY_TRACES_SAMPLE_RATE', 'warning', 'Should be a number between 0 and 1', 'Set to 0.1 for 10% sampling');
      }
    }
  }

  private checkStorageConfiguration() {
    const storageProvider = this.get('STORAGE_PROVIDER');
    
    if (storageProvider === 'cloudflare') {
      this.checkNonEmpty('CLOUDFLARE_ACCOUNT_ID', 'error', 'Required for Cloudflare storage');
      this.checkNonEmpty('CLOUDFLARE_ACCESS_KEY', 'error', 'Required for Cloudflare storage');
      this.checkNonEmpty('CLOUDFLARE_SECRET_ACCESS_KEY', 'error', 'Required for Cloudflare storage');
      this.checkNonEmpty('CLOUDFLARE_BUCKETNAME', 'error', 'Required for Cloudflare storage');
      this.checkIsValidUrl('CLOUDFLARE_BUCKET_URL', 'error');
    } else if (storageProvider === 'local') {
      const uploadDir = this.get('UPLOAD_DIRECTORY');
      if (!uploadDir) {
        this.addIssue('UPLOAD_DIRECTORY', 'warning', 'Recommended for local storage', 'Set to a writable directory path');
      }
    }
  }

  private checkEmailConfiguration() {
    const resendKey = this.get('RESEND_API_KEY');
    
    if (resendKey) {
      this.checkNonEmpty('EMAIL_FROM_ADDRESS', 'warning', 'Recommended when email is configured');
      this.checkNonEmpty('EMAIL_FROM_NAME', 'warning', 'Recommended when email is configured');
      
      // Validate email format
      const fromAddress = this.get('EMAIL_FROM_ADDRESS');
      if (fromAddress && !this.isValidEmail(fromAddress)) {
        this.addIssue('EMAIL_FROM_ADDRESS', 'error', 'Invalid email format');
      }
    }
  }

  private checkSocialMediaConfiguration() {
    // Check if at least one social media provider is configured
    const providers = [
      'DISCORD_BOT_TOKEN_ID',
      'FACEBOOK_CLIENT_ID',
      'INSTAGRAM_CLIENT_ID',
      'LINKEDIN_CLIENT_ID',
      'TWITTER_CLIENT_ID',
      'YOUTUBE_CLIENT_ID',
      'MASTODON_CLIENT_ID',
    ];
    
    const configuredProviders = providers.filter(provider => this.get(provider));
    
    if (configuredProviders.length === 0) {
      this.addIssue('SOCIAL_PROVIDERS', 'warning', 'No social media providers configured', 'Configure at least one social media provider for posting');
    }
  }

  private checkSecuritySettings() {
    // Check JWT secret strength
    const jwtSecret = this.get('JWT_SECRET');
    if (jwtSecret && jwtSecret.length < 32) {
      this.addIssue('JWT_SECRET', 'warning', 'JWT secret should be at least 32 characters long for security');
    }
    
    // Check if running in production with debug settings
    const nodeEnv = this.get('NODE_ENV');
    const sentryDebug = this.get('SENTRY_DEBUG') === 'true';
    
    if (nodeEnv === 'production' && sentryDebug) {
      this.addIssue('SENTRY_DEBUG', 'warning', 'Debug mode should be disabled in production');
    }
  }

  checkNonEmpty(key: string, severity: 'error' | 'warning' | 'info' = 'error', description?: string, suggestion?: string): boolean {
    const v = this.get(key);

    if (!v) {
      this.addIssue(key, severity, `${key} not set. ${description || ''}`, suggestion);
      return false;
    }

    if (v.length === 0) {
      this.addIssue(key, severity, `${key} is empty. ${description || ''}`, suggestion);
      return false;
    }

    return true;
  }

  private addIssue(key: string, severity: 'error' | 'warning' | 'info', message: string, suggestion?: string) {
    this.issues.push({ key, severity, message, suggestion });
  }

  get(key: string): string | undefined {
    return this.cfg[key as keyof typeof this.cfg];
  }

  checkDatabaseServers() {
    this.checkRedis();
    this.checkIsValidUrl('DATABASE_URL', 'error');
  }

  checkRedis() {
    if (!this.cfg.REDIS_URL) {
      this.addIssue('REDIS_URL', 'error', 'REDIS_URL not set', 'Set to redis://localhost:6379 for local development');
      return;
    }

    try {
      const redisUrl = new URL(this.cfg.REDIS_URL);

      if (redisUrl.protocol !== 'redis:') {
        this.addIssue('REDIS_URL', 'error', 'REDIS_URL must start with redis://');
      }
    } catch (error) {
      this.addIssue('REDIS_URL', 'error', 'REDIS_URL is not a valid URL');
    }
  }

  checkIsValidUrl(key: string, severity: 'error' | 'warning' | 'info' = 'error') {
    if (!this.checkNonEmpty(key, severity)) {
      return;
    }

    const urlString = this.get(key)!;

    try {
      new URL(urlString);
    } catch (error) {
      this.addIssue(key, severity, `${key} is not a valid URL`);
      return;
    }

    if (urlString.endsWith('/')) {
      this.addIssue(key, 'warning', `${key} should not end with /`);
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  hasIssues(): boolean {
    return this.issues.length > 0;
  }

  hasErrors(): boolean {
    return this.issues.some(issue => issue.severity === 'error');
  }

  getIssues(): ConfigurationIssue[] {
    return this.issues;
  }

  getErrorCount(): number {
    return this.issues.filter(issue => issue.severity === 'error').length;
  }

  getWarningCount(): number {
    return this.issues.filter(issue => issue.severity === 'warning').length;
  }

  getIssuesCount(): number {
    return this.issues.length;
  }

  printSummary(): void {
    const errors = this.getErrorCount();
    const warnings = this.getWarningCount();
    
    console.log('\n=== Configuration Check Summary ===');
    console.log(`Errors: ${errors}`);
    console.log(`Warnings: ${warnings}`);
    
    if (this.hasIssues()) {
      console.log('\n=== Issues Found ===');
      
      this.issues.forEach(issue => {
        const prefix = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${prefix} [${issue.severity.toUpperCase()}] ${issue.key}: ${issue.message}`);
        
        if (issue.suggestion) {
          console.log(`   💡 Suggestion: ${issue.suggestion}`);
        }
      });
    } else {
      console.log('✅ No configuration issues found!');
    }
    
    console.log('==================================\n');
  }
}
