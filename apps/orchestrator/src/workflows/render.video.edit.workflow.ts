import { ActivityFailure, proxyActivities } from '@temporalio/workflow';
import { MediaActivity } from '@gitroom/orchestrator/activities/media.activity';
import { VideoEdit } from '@gitroom/nestjs-libraries/videos/video.edit';

// One encode. A retry would write a second file for the same library item
const { renderVideoEdit } = proxyActivities<MediaActivity>({
  startToCloseTimeout: '20 minutes',
  taskQueue: 'main',
  retry: {
    maximumAttempts: 1,
  },
});

const { failMediaProcessing } = proxyActivities<MediaActivity>({
  startToCloseTimeout: '2 minutes',
  taskQueue: 'main',
  retry: {
    maximumAttempts: 10,
    backoffCoefficient: 2,
    initialInterval: '10 seconds',
    maximumInterval: '2 minutes',
  },
});

const reason = (err: any) =>
  ((err instanceof ActivityFailure ? err.cause?.message : err?.message) ||
    'Could not render the video'
  ).slice(0, 4000);

export async function renderVideoEditWorkflow({
  mediaId,
  edit,
}: {
  mediaId: string;
  edit: VideoEdit;
}) {
  try {
    await renderVideoEdit(mediaId, edit);
  } catch (err: any) {
    await failMediaProcessing(mediaId, reason(err));
  }
}
