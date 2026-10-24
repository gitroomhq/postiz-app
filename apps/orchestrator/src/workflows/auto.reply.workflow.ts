import { proxyActivities } from '@temporalio/workflow';
import { AutoReplyActivity } from '@gitroom/orchestrator/activities/auto.reply.activity';
import { AutoReplyEvent } from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';

// Sends are claimed before they go out, so a retried activity never repeats a delivered message
const { processAutoReplyEvent } = proxyActivities<AutoReplyActivity>({
  startToCloseTimeout: '2 minute',
  taskQueue: 'main',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 3,
    initialInterval: '1 minute',
  },
});

export async function autoReplyWorkflow({
  integrationId,
  event,
}: {
  integrationId: string;
  event: AutoReplyEvent;
}) {
  await processAutoReplyEvent(integrationId, event);
}
