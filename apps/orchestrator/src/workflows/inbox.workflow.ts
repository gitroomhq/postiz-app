import { proxyActivities, sleep, continueAsNew } from '@temporalio/workflow';
import { InboxActivity } from '@gitroom/orchestrator/activities/inbox.activity';

const { syncAllInboxes } = proxyActivities<InboxActivity>({
  startToCloseTimeout: '5 minute',
  taskQueue: 'main',
  cancellationType: 'ABANDON',
});

const POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export async function inboxSyncWorkflow({
  organizationId,
}: {
  organizationId: string;
}) {
  while (true) {
    try {
      await syncAllInboxes(organizationId);
    } catch (err) {
      // continue polling even on error
    }
    await sleep(POLL_INTERVAL_MS);
    await continueAsNew<typeof inboxSyncWorkflow>({ organizationId });
  }
}
