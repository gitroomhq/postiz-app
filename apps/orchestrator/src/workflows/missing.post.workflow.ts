import {
  continueAsNew,
  patched,
  proxyActivities,
  sleep,
  workflowInfo,
} from '@temporalio/workflow';
import { PostActivity } from '@gitroom/orchestrator/activities/post.activity';

const { searchForMissingThreeHoursPosts } = proxyActivities<PostActivity>({
  startToCloseTimeout: '10 minute',
  retry: {
    maximumAttempts: 3,
    backoffCoefficient: 1,
    initialInterval: '2 minutes',
  },
});

export async function missingPostWorkflow() {
  let loops = 0;
  await searchForMissingThreeHoursPosts();
  while (true) {
    await sleep('1 hour');

    // Keep the history small, the new run searches immediately so the hourly cadence is kept
    if (
      patched('missing-post-continue-as-new') &&
      (++loops >= 24 || workflowInfo().historyLength > 1000)
    ) {
      return await continueAsNew<typeof missingPostWorkflow>();
    }

    await searchForMissingThreeHoursPosts();
  }
}
