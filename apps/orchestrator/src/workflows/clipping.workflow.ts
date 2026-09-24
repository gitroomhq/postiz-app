import {
  ActivityFailure,
  ApplicationFailure,
  CancellationScope,
  executeChild,
  proxyActivities,
  sleep,
} from '@temporalio/workflow';
import { ClippingActivity } from '@gitroom/orchestrator/activities/clipping.activity';
import type { ClippingJobState } from '@gitroom/nestjs-libraries/database/prisma/clipping/clipping.service';

// Submitting is a plain POST with no idempotency key. A retry after the queue
// accepted the job runs it twice, which only costs the second job: both write
// the same files and only the last job id is polled. That is cheaper than
// failing a paid clipping on a connection blip or a worker restart
const { submitClippingAnalyse, submitClipFetch, submitClipRender } =
  proxyActivities<ClippingActivity>({
    startToCloseTimeout: '2 minute',
    taskQueue: 'main',
    retry: {
      maximumAttempts: 3,
      backoffCoefficient: 2,
      initialInterval: '10 seconds',
    },
  });

// Polling and bookkeeping are idempotent: ride out an outage of a few minutes.
// A reason that can't change is thrown as non retryable and skips the retries
const {
  checkClippingAnalyse,
  checkClipFetch,
  checkClipRender,
  failClip,
  createClippingDrafts,
  finishClipping,
  failClipping,
} = proxyActivities<ClippingActivity>({
  startToCloseTimeout: '2 minute',
  taskQueue: 'main',
  retry: {
    maximumAttempts: 10,
    backoffCoefficient: 2,
    initialInterval: '10 seconds',
    maximumInterval: '2 minutes',
  },
});

// Transcribing and picking wait on an AI provider for the whole call; running
// one again only costs a few cents and overwrites the same result
const { transcribeClipping, pickClippingClips, captionClip } =
  proxyActivities<ClippingActivity>({
    startToCloseTimeout: '15 minute',
    taskQueue: 'main',
    retry: {
      maximumAttempts: 3,
      backoffCoefficient: 1,
      initialInterval: '1 minute',
    },
  });

// The workflow only sees the activity failure wrapper; the reason is its cause.
// Only a "clipping_stop" was written for the customer, anything else (a
// provider's answer, a timeout) is for the logs
const reason = (err: any, fallback: string) => {
  const cause = err instanceof ActivityFailure ? err.cause : err;
  return {
    error: cause?.message || fallback,
    customer:
      cause instanceof ApplicationFailure && cause.type === 'clipping_stop',
  };
};

// The media service has no callbacks, and the RunPod job TTL is one hour so
// polling past it is pointless. Most jobs answer within a minute; one that
// waits on a cold endpoint is polled slower so it does not fill the history
const FAST_POLLS = 12;
const FAST_INTERVAL = 5000;
const SLOW_INTERVAL = 15000;
const MAX_POLLS =
  FAST_POLLS + (60 * 60 * 1000 - FAST_POLLS * FAST_INTERVAL) / SLOW_INTERVAL;
// how many times a job the media service called retryable is submitted
const MAX_SUBMITS = 3;

// Runs one job to its end. Only a "retry" answer submits it again; a job that
// never answered is failed, its twin could still be sitting in the queue
async function runJob<T extends { state: ClippingJobState }>(
  submit: () => Promise<string>,
  check: (jobId: string) => Promise<T>
): Promise<T | { state: 'failed' }> {
  for (let attempt = 0; attempt < MAX_SUBMITS; attempt++) {
    const jobId = await submit();
    let answer: T | undefined;
    for (let i = 0; i < MAX_POLLS; i++) {
      await sleep(i < FAST_POLLS ? FAST_INTERVAL : SLOW_INTERVAL);
      answer = await check(jobId);
      if (answer.state !== 'pending') {
        break;
      }
    }

    if (answer?.state !== 'retry') {
      return !answer || answer.state === 'pending'
        ? { state: 'failed' }
        : answer;
    }
  }

  return { state: 'failed' };
}

// One clip, in a workflow of its own so ten clips polling side by side never
// share one history. A clip that fails is recorded on the clip and never
// throws, the other clips of the video go on
export async function clippingClipWorkflow({ clipId }: { clipId: string }) {
  try {
    const fetched = await runJob(
      () => submitClipFetch({ clipId }),
      (jobId) => checkClipFetch({ clipId, jobId })
    );
    if (fetched.state !== 'done') {
      await failClip({
        clipId,
        error: 'The clip could not be downloaded',
        customer: true,
      });
      return;
    }

    await captionClip({ clipId });

    const rendered = await runJob(
      () => submitClipRender({ clipId }),
      (jobId) => checkClipRender({ clipId, jobId })
    );
    if (rendered.state !== 'done') {
      await failClip({
        clipId,
        error: 'The clip could not be rendered',
        customer: true,
      });
    }
  } catch (err: any) {
    try {
      // a cancelled workflow still has to say what happened to its clip
      await CancellationScope.nonCancellable(() =>
        failClip({ clipId, ...reason(err, 'The clip could not be rendered') })
      );
    } catch (failed: any) {
      // the clip stays pending and the finish of the clipping closes it
    }
  }
}

export async function clippingWorkflow({ clippingId }: { clippingId: string }) {
  try {
    const analysed = await runJob(
      () => submitClippingAnalyse({ clippingId }),
      (jobId) => checkClippingAnalyse({ clippingId, jobId })
    );
    if (analysed.state !== 'done') {
      return failClipping({
        clippingId,
        error: 'The video could not be analysed',
        customer: true,
      });
    }

    if ('transcribe' in analysed && analysed.transcribe) {
      await transcribeClipping({ clippingId });
    }

    const clips = await pickClippingClips({ clippingId });
    // a clip workflow that died still leaves its clip unrendered, which the
    // finish below reads from the records
    await Promise.all(
      clips.map((clipId: string) =>
        executeChild(clippingClipWorkflow, {
          workflowId: `clipping_clip_${clipId}`,
          args: [{ clipId }],
        }).catch(() => undefined)
      )
    );
  } catch (err: any) {
    // a cancelled clipping is still closed and refunded
    return CancellationScope.nonCancellable(() =>
      failClipping({ clippingId, ...reason(err, 'Clipping failed') })
    );
  }

  // the clips are in the media library by now; a draft that could not be
  // created is reported on the clipping and never takes them away
  try {
    await createClippingDrafts({ clippingId });
  } catch (err: any) {
    return CancellationScope.nonCancellable(() =>
      failClipping({
        clippingId,
        ...reason(err, 'The draft posts could not be created'),
      })
    );
  }

  return finishClipping({ clippingId });
}
