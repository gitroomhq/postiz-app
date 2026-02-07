/**
 * Queue: analytics-sync
 *
 * Dispatched after a post is successfully published (with a 1-hour delay)
 * and then re-scheduled every 24 hours to keep analytics up to date.
 */

export const ANALYTICS_SYNC_QUEUE = 'analytics-sync';

export interface AnalyticsSyncJobData {
  /** UUID of the Post to fetch analytics for */
  postId: string;

  /** UUID of the Integration used to publish the post */
  integrationId: string;
}

/** Default job options for analytics-sync jobs */
export const ANALYTICS_SYNC_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 60_000, // 1 minute
  },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 500 },
};
