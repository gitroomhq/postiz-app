import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

// Meant for the upload widget itself: visibility "app" asks the host to keep it
// away from the model, so the upload credential stays out of the conversation.
// It is a hint only - the ticket is still scoped to the caller's own organization
@Injectable()
export class UploadWidgetTicketTool implements AgentToolInterface {
  constructor(private _mediaService: MediaService) {}
  name = 'uploadWidgetTicketTool';
  mcpOnly = true;

  run() {
    return createTool({
      id: 'uploadWidgetTicketTool',
      description: `Used by the upload widget to get a short-lived upload ticket for the sessionId returned by uploadWidgetTool.`,
      mcp: {
        annotations: {
          title: 'Upload Widget Ticket',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        },
        _meta: {
          ui: {
            visibility: ['app'],
          },
        },
      },
      inputSchema: z.object({
        sessionId: z
          .string()
          .describe('The sessionId returned by uploadWidgetTool'),
      }),
      outputSchema: z.object({
        ticket: z.string().optional(),
        error: z.string().optional(),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        try {
          const org = JSON.parse(
            (context?.requestContext as any)?.get('organization') as string
          );
          return {
            ticket: await this._mediaService.createUploadTicket(
              org.id,
              inputData.sessionId
            ),
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { error: `Failed to create an upload ticket: ${message}` };
        }
      },
    });
  }
}
