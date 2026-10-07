import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { HttpException, Injectable } from '@nestjs/common';
import { ClippingService } from '@gitroom/nestjs-libraries/database/prisma/clipping/clipping.service';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';

// Meant for the clipping widget itself: visibility "app" asks the host to keep it
// away from the model, so the ticket stays out of the conversation.
// It is a hint only - the ticket is still scoped to the caller's own organization
@Injectable()
export class ClippingWidgetTicketTool implements AgentToolInterface {
  constructor(private _clippingService: ClippingService) {}
  name = 'clippingWidgetTicketTool';
  mcpOnly = true;

  available() {
    return UploadFactory.clippingEnabled();
  }

  run() {
    return createTool({
      id: 'clippingWidgetTicketTool',
      description: `Used by the clipping widget to get a short-lived ticket to read the status of the clippingId returned by clippingTool.`,
      mcp: {
        annotations: {
          title: 'Clipping Widget Ticket',
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
        clippingId: z
          .string()
          .describe('The clippingId returned by clippingTool'),
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
            ticket: await this._clippingService.createWidgetTicket(
              org.id,
              inputData.clippingId
            ),
          };
        } catch (err) {
          const message =
            err instanceof HttpException ? err.message : 'Something went wrong';
          return { error: `Failed to create a clipping ticket: ${message}` };
        }
      },
    });
  }
}
