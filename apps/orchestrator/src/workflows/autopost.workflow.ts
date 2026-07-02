import { log, proxyActivities, sleep } from '@temporalio/workflow';
import { AutopostActivity } from '@gitroom/orchestrator/activities/autopost.activity';

const { autoPost } = proxyActivities<AutopostActivity>({
  startToCloseTimeout: '10 minute',
  taskQueue: 'main',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 2,
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
  while (true) {
    try {
      if (immediately) {
        await autoPost(id);
      }
    } catch (err) {
      log.error('autoPostWorkflow failed after retries', {
        id,
        message: (err as Error)?.message,
      });
    }
    immediately = true;
    await sleep(3600000);
  }
}
