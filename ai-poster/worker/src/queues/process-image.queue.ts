/**
 * Queue: process-image
 *
 * Dispatched for semi-automated campaigns where users upload images
 * and the system generates platform-specific captions by analysing
 * each image with OpenAI Vision.
 */

export const PROCESS_IMAGE_QUEUE = 'process-image';

export interface ProcessImageJobData {
  /** UUID of the Media record to analyse */
  mediaId: string;

  /** UUID of the owning Organization */
  organizationId: string;

  /** UUID of the Campaign the image belongs to */
  campaignId: string;

  /** Optional template to guide caption generation */
  templateId?: string;
}

/** Default job options for process-image jobs */
export const PROCESS_IMAGE_JOB_OPTIONS = {
  attempts: 2,
  backoff: {
    type: 'exponential' as const,
    delay: 30_000,
  },
  removeOnComplete: { count: 300 },
  removeOnFail: { count: 100 },
};
