/**
 * Queue: refresh-token
 *
 * Runs periodically (or on-demand when a publish attempt discovers
 * an expired token) to refresh OAuth tokens for social-platform
 * integrations before they expire.
 */

export const REFRESH_TOKEN_QUEUE = 'refresh-token';

export interface RefreshTokenJobData {
  /** UUID of the Integration whose token needs refreshing */
  integrationId: string;
}

/** Default job options for refresh-token jobs */
export const REFRESH_TOKEN_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 15_000, // 15 seconds
  },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 500 },
};
