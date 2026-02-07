/**
 * Queue: publish-post
 *
 * Dispatched when a post reaches its scheduled publish time.
 * The worker picks up the job, publishes the post to the target
 * social platform via the integration, and updates the post state.
 */

export const PUBLISH_POST_QUEUE = 'publish-post';

export interface PublishPostJobData {
  /** UUID of the Post record to publish */
  postId: string;

  /** UUID of the Integration (social channel) to publish through */
  integrationId: string;

  /** UUID of the owning Organization */
  organizationId: string;
}

/** Default job options for publish-post jobs */
export const PUBLISH_POST_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 30_000, // 30 seconds initial delay, then 60s, 120s
  },
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 200 },
};
