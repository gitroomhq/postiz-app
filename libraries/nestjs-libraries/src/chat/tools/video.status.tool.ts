import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { Injectable } from '@nestjs/common';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { z } from 'zod';

@Injectable()
export class VideoStatusTool implements AgentToolInterface {
  constructor(private _mediaService: MediaService) {}
  name = 'videoStatusTool';

  run() {
    return createTool({
      id: 'videoStatusTool',
      mcp: {
        annotations: {
          title: 'Video Generation Status',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      description: `Check the status of a video generation started with 'generateVideoTool', using the jobId it returned.
                    Generating a video takes a few minutes: while the status is "pending", wait about 30 seconds and call again.
                    When the status is "completed" the result contains the hosted video url, which can be used as a post attachment.
                    When the status is "failed" the result contains the error message.
      `,
      inputSchema: z.object({
        jobId: z.string().describe('The jobId returned by generateVideoTool'),
      }),
      outputSchema: z.object({
        status: z.enum(['pending', 'completed', 'failed']).optional(),
        id: z.string().optional(),
        url: z.string().optional(),
        error: z.string().optional(),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const org = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        );
        try {
          const job = await this._mediaService.getGenerateVideoStatus(
            org,
            inputData.jobId
          );

          return {
            status: job.status,
            id: job.id,
            url: job.path,
            error: job.error,
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            error: `Video job lookup failed: ${message}`,
          };
        }
      },
    });
  }
}
