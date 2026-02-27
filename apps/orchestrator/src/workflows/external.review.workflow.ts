import {
  condition,
  proxyActivities,
  setHandler,
  sleep,
} from '@temporalio/workflow';
import { PostActivity } from '@gitroom/orchestrator/activities/post.activity';
import { externalReviewResolvedSignal } from '@gitroom/orchestrator/signals/external.review.signal';

const { sendExternalReviewReminder, expireExternalReview } =
  proxyActivities<PostActivity>({
    startToCloseTimeout: '10 minute',
    taskQueue: 'main',
    cancellationType: 'ABANDON',
    retry: {
      maximumAttempts: 3,
      backoffCoefficient: 1,
      initialInterval: '2 minutes',
    },
  });

export async function externalReviewWorkflow({
  token,
  reminderDelayMs = 0,
  expiryDelayMs = 0,
}: {
  token: string;
  reminderDelayMs?: number;
  expiryDelayMs?: number;
}) {
  const safeReminderDelay = Math.max(0, Number(reminderDelayMs || 0));
  const safeExpiryDelay = Math.max(0, Number(expiryDelayMs || 0));
  let resolved = false;

  setHandler(externalReviewResolvedSignal, () => {
    resolved = true;
  });

  if (safeReminderDelay > 0) {
    await Promise.race([sleep(safeReminderDelay), condition(() => resolved)]);
  }

  if (!resolved) {
    await sendExternalReviewReminder(token);
  }

  const remainingToExpiry = Math.max(0, safeExpiryDelay - safeReminderDelay);
  if (remainingToExpiry > 0) {
    await Promise.race([sleep(remainingToExpiry), condition(() => resolved)]);
  }

  if (!resolved) {
    await expireExternalReview(token);
  }
}
