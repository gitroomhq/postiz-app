import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { HttpException, Injectable } from '@nestjs/common';
import { ClippingService } from '@gitroom/nestjs-libraries/database/prisma/clipping/clipping.service';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { CLIPPING_WIDGET_URI } from '@gitroom/nestjs-libraries/chat/ui/clipping.widget';

@Injectable()
export class ClippingTool implements AgentToolInterface {
  constructor(private _clippingService: ClippingService) {}
  name = 'clippingTool';

  available() {
    return UploadFactory.clippingEnabled();
  }

  run() {
    return createTool({
      id: 'clippingTool',
      mcp: {
        annotations: {
          title: 'Clip a Video',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
        // apps that support MCP Apps show the progress and the clips in a widget,
        // which also tells the conversation when the clips are ready
        _meta: {
          ui: {
            resourceUri: CLIPPING_WIDGET_URI,
          },
        },
      },
      description: `Turn a long YouTube video into short vertical clips with burned-in captions.
                    The best parts of the video are picked automatically, every clip is saved to the media library,
                    and when channels are passed a draft post is created for every clip on every channel (nothing is scheduled or published).
                    Before calling this tool, always ask the user how the horizontal video should fill the vertical clip, and wait for the answer:
                    "blur" keeps the whole picture over a blurred copy of itself, "crop" fills the clip with the middle of the picture and cuts the sides away.
                    Never pick one for the user, unless they already said which one they want in this conversation.
                    It uses the clipping minutes of the subscription: one minute for every minute of the source video.
                    Clipping takes several minutes, so this only starts it and returns a clippingId: tell the user it is running.
                    Some apps show a widget with the progress and report the finished clips in the conversation by themselves.
                    Whenever the user asks how it is going, or when no such report arrived, call 'clippingStatusTool' with the clippingId to get the clips.
      `,
      inputSchema: z.object({
        url: z.string().url().describe('URL of the YouTube video'),
        integrations: z
          .array(z.string())
          .max(20)
          .optional()
          .describe(
            'Ids of the channels to create draft posts for, from integrationListTool'
          ),
        clips: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .describe('Maximum number of clips, 5 by default'),
        fit: z
          .enum(['crop', 'blur'])
          .describe(
            'How the horizontal video fills the vertical clip, as answered by the user: ask them before calling this tool and never guess it. "blur" keeps the whole picture over a blurred copy of itself and is always safe. "crop" fills the clip with the middle of the picture and cuts the sides away: there is no face tracking, so a speaker who is not in the centre is cut out of the clip. When asking, tell the user that with "crop" anything outside the centre of the picture will be lost.'
          ),
      }),
      outputSchema: z.object({
        clippingId: z.string().optional(),
        error: z.string().optional(),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const org = JSON.parse(
          (context?.requestContext as any)?.get('organization') as string
        );
        try {
          const value = await this._clippingService.startClipping(org, {
            url: inputData.url,
            integrations: inputData.integrations,
            clips: inputData.clips,
            fit: inputData.fit,
          });

          return {
            clippingId: value.id,
          };
        } catch (err) {
          // SubscriptionException (402) carries { section, action } and its
          // message is just "Subscription Exception", so translate it
          // only what was written for the user goes to the model: a database or
          // provider error carries paths, queries and urls
          const message =
            err instanceof HttpException && err.getStatus() === 402
              ? 'No clipping minutes are left on this account for this month'
              : err instanceof HttpException
              ? err.message
              : 'Something went wrong';
          if (!(err instanceof HttpException)) {
            console.error('clippingTool failed:', err);
          }
          return {
            error: `Clipping could not start: ${message}. No clipping minutes were used.`,
          };
        }
      },
    });
  }
}
