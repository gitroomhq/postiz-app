import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { SubscriptionService } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/subscription.service';

@Injectable()
export class GenerateImageTool implements AgentToolInterface {
  private storage = UploadFactory.createStorage();

  constructor(
    private _mediaService: MediaService,
    private _subscriptionService: SubscriptionService
  ) {}
  name = 'generateImageTool';

  run() {
    return createTool({
      id: 'generateImageTool',
      description: `Generate image to use in a post,
                    in case the user specified a platform that requires attachment and attachment was not provided,
                    ask if they want to generate a picture of a video.
                    Wait for this tool to return before scheduling; pass the returned "path" verbatim as the attachment.
      `,
      mcp: {
        annotations: {
          title: 'Generate Image',
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      inputSchema: z.object({
        prompt: z.string(),
      }),
      // Mastra validates the return against this schema, so it must also
      // allow the graceful { error } shape (same as uploadFromUrlTool)
      outputSchema: z.object({
        id: z.string().optional(),
        path: z.string().optional(),
        error: z.string().optional(),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const org = JSON.parse((context?.requestContext as any)?.get('organization') as string);
        try {
          // Same credit gate as the dashboard's /media/generate-image route -
          // only enforced when billing is enabled (cloud), self-hosted is free
          const total = await this._subscriptionService.checkCredits(org);
          if (process.env.STRIPE_PUBLISHABLE_KEY && total.credits <= 0) {
            return {
              error: 'No AI image credits are available on this account.',
            };
          }

          const image = await this._mediaService.generateImage(
            inputData.prompt,
            org
          );

          const file = await this.storage.uploadSimple(
            'data:image/png;base64,' + image
          );

          return await this._mediaService.saveFile(
            org.id,
            file.split('/').pop(),
            file
          );
        } catch (err) {
          return {
            error: `Image generation failed: ${
              err instanceof Error ? err.message : String(err)
            }. The user's image credit was not used.`,
          };
        }
      },
    });
  }
}
