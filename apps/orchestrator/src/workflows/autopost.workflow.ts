import {
  continueAsNew,
  patched,
  proxyActivities,
  sleep,
  workflowInfo,
} from '@temporalio/workflow';
import { AutopostActivity } from '@gitroom/orchestrator/activities/autopost.activity';

const { autoPost } = proxyActivities<AutopostActivity>({
  startToCloseTimeout: '10 minute',
  taskQueue: 'main',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 1,
    initialInterval: '2 minutes',
  },
});

export async function autoPostWorkflow({
  id,
  immediately,
}: {
  id: string;
  immediately: boolean;
}) {
  let loops = 0;
  while (true) {
    try {
      if (immediately) {
        await autoPost(id);
      }
    } catch (err) {}
    immediately = true;
    await sleep(3600000);

    // Keep the history small, runs started before this patch continue-as-new on their first live loop
    if (
      patched('autopost-continue-as-new') &&
      (++loops >= 24 || workflowInfo().historyLength > 1000)
    ) {
      return await continueAsNew<typeof autoPostWorkflow>({
        id,
        immediately: true,
      });
    }
  }
}
