import { ActivityFailure, proxyActivities, sleep } from '@temporalio/workflow';
import { MediaActivity } from '@gitroom/orchestrator/activities/media.activity';

// Submitting is a plain POST with no idempotency key, so a retry after the
// queue accepted the job would run it twice; one attempt, and a failure
// releases the media instead
const { submitMediaProcessing } = proxyActivities<MediaActivity>({
  startToCloseTimeout: '2 minute',
  taskQueue: 'main',
  retry: {
    maximumAttempts: 1,
  },
});

// Polling is idempotent: ride out a queue API outage of a few minutes.
// Terminal answers are recorded by the activity itself and never throw
const { checkMediaProcessing, failMediaProcessing } =
  proxyActivities<MediaActivity>({
    startToCloseTimeout: '2 minute',
    taskQueue: 'main',
    retry: {
      maximumAttempts: 10,
      backoffCoefficient: 2,
      initialInterval: '10 seconds',
      maximumInterval: '2 minutes',
    },
  });

// the workflow only sees the activity failure wrapper; the reason is its cause
const reason = (err: any, fallback: string) =>
  (err instanceof ActivityFailure ? err.cause?.message : err?.message) ||
  fallback;

// Polls a job on the media normalization service; the service has no callbacks,
// and the RunPod job TTL is one hour so polling past it is pointless
const POLL_INTERVAL = 5000;
const MAX_POLLS = (60 * 60 * 1000) / POLL_INTERVAL;

export async function processMediaWorkflow({ mediaId }: { mediaId: string }) {
  let jobId: string | null;
  try {
    jobId = await submitMediaProcessing(mediaId);
  } catch (err: any) {
    await failMediaProcessing(mediaId, reason(err, 'Could not submit job'));
    return;
  }

  // nothing to run: the activity already released the media as ready
  if (!jobId) {
    return;
  }

  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_INTERVAL);
    try {
      if (await checkMediaProcessing(mediaId, jobId)) {
        return;
      }
    } catch (err: any) {
      await failMediaProcessing(mediaId, reason(err, 'Could not check job'));
      return;
    }
  }

  await failMediaProcessing(mediaId, 'Processing timed out');
}
