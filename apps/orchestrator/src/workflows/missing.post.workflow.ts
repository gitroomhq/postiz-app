import { proxyActivities, sleep } from '@temporalio/workflow';
import { PostActivity } from '@gitroom/orchestrator/activities/post.activity';

const { searchForMissingThreeHoursPosts, releaseStaleClaims } =
  proxyActivities<PostActivity>({
    startToCloseTimeout: '10 minute',
    retry: {
      maximumAttempts: 3,
      backoffCoefficient: 1,
      initialInterval: '2 minutes',
    },
  });

export async function missingPostWorkflow() {
  await searchForMissingThreeHoursPosts();
  while (true) {
    await sleep('1 hour');
    await searchForMissingThreeHoursPosts();
    // VOC-43: clear orphan posting claims (>2h). The activity is a no-op unless
    // IDEMPOTENT_POSTING is enabled. NOTE: this adds a command to a singleton
    // long-running workflow; the existing `missing-post-workflow` instance must
    // be restarted (worker redeploy/terminate) to replay cleanly without
    // non-determinism. Safe in internal testing (no production runs to preserve).
    await releaseStaleClaims(120);
  }
}
