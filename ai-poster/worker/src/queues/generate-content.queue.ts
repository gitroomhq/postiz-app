/**
 * Queue: generate-content
 *
 * Dispatched when a campaign is activated and needs AI-generated posts.
 * The worker generates content for every calendar slot in the campaign
 * using OpenAI with the campaign template as context.
 */

export const GENERATE_CONTENT_QUEUE = 'generate-content';

export interface GenerateContentJobData {
  /** UUID of the Campaign to generate content for */
  campaignId: string;

  /** UUID of the owning Organization */
  organizationId: string;

  /** Optional template override (defaults to campaign.templateId) */
  templateId?: string;

  /** Optional list of topics to distribute across generated posts */
  topics?: string[];
}

/** Default job options for generate-content jobs */
export const GENERATE_CONTENT_JOB_OPTIONS = {
  attempts: 2,
  backoff: {
    type: 'exponential' as const,
    delay: 60_000, // 1 minute
  },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 100 },
};
