import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { UPLOAD_WIDGET_URI } from '@gitroom/nestjs-libraries/chat/ui/upload.widget';

@Injectable()
export class UploadWidgetTool implements AgentToolInterface {
  constructor(private _mediaService: MediaService) {}
  name = 'uploadWidgetTool';
  mcpOnly = true;

  run() {
    return createTool({
      id: 'uploadWidgetTool',
      description: `Show the user an upload widget to add images or videos from their own device to the media library.
Use this when the user wants to attach a local file to a post. When the media is already available on a public URL, use uploadFromUrlTool instead.
The widget is only displayed by apps that support MCP Apps (interactive UI); in any other app no widget appears and uploadFromUrlTool with a public URL is the way to add media.
Returns a sessionId: the files the user uploads are reported in the conversation, and can also be read with uploadWidgetStatusTool.`,
      mcp: {
        annotations: {
          title: 'Upload Media From Device',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        },
        _meta: {
          ui: {
            resourceUri: UPLOAD_WIDGET_URI,
          },
        },
      },
      inputSchema: z.object({}),
      outputSchema: z.object({
        sessionId: z.string().optional(),
        error: z.string().optional(),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        try {
          const org = JSON.parse(
            (context?.requestContext as any)?.get('organization') as string
          );
          return {
            sessionId: await this._mediaService.createUploadSession(org.id),
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { error: `Failed to open the upload widget: ${message}` };
        }
      },
    });
  }
}
