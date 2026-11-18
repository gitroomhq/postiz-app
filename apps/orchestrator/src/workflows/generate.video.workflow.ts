import { proxyActivities } from '@temporalio/workflow';
import { VideoActivity } from '@gitroom/orchestrator/activities/video.activity';
import type { VideoDto } from '@gitroom/nestjs-libraries/dtos/videos/video.dto';

// Generating a video consumes a credit, so a failed attempt is never retried
const { generateVideo } = proxyActivities<VideoActivity>({
  startToCloseTimeout: '40 minute',
  taskQueue: 'main',
  retry: {
    maximumAttempts: 1,
  },
});

export async function generateVideoWorkflow({
  organizationId,
  body,
}: {
  organizationId: string;
  body: VideoDto;
}) {
  return generateVideo(organizationId, body);
}
