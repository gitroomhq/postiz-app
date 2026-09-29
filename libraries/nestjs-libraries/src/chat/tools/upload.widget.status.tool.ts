import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

@Injectable()
export class UploadWidgetStatusTool implements AgentToolInterface {
  constructor(private _mediaService: MediaService) {}
  name = 'uploadWidgetStatusTool';
  mcpOnly = true;

  run() {
    return createTool({
      id: 'uploadWidgetStatusTool',
      description: `List the media the user uploaded with the upload widget, using the sessionId returned by uploadWidgetTool.
An empty list means the user did not upload anything yet. A media with the status "processing" is still being prepared: wait about 10 seconds and call again.
A media with the status "ready" can be used as a post attachment with its { id, path }.`,
      mcp: {
        annotations: {
          title: 'Upload Widget Status',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      inputSchema: z.object({
        sessionId: z
          .string()
          .describe('The sessionId returned by uploadWidgetTool'),
      }),
      outputSchema: z.object({
        media: z
          .array(
            z.object({
              id: z.string(),
              path: z.string(),
              status: z.string(),
              error: z.string().optional(),
            })
          )
          .optional(),
        error: z.string().optional(),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        try {
          const org = JSON.parse(
            (context?.requestContext as any)?.get('organization') as string
          );
          const media = await this._mediaService.getUploadSession(
            org.id,
            inputData.sessionId
          );
          return {
            media: media.map((p) => ({
              id: p.id,
              path: p.path,
              status: p.status,
              ...(p.processingError ? { error: p.processingError } : {}),
            })),
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { error: `Upload session lookup failed: ${message}` };
        }
      },
    });
  }
}
