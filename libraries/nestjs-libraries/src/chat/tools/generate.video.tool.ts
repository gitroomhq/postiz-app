import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { readRequestContext } from '@gitroom/nestjs-libraries/chat/tools/tool.context.helper';

@Injectable()
export class GenerateVideoTool implements AgentToolInterface {
  constructor(private _mediaService: MediaService) {}
  name = 'generateVideoTool';

  run() {
    return createTool({
      id: 'generateVideoTool',
      description: `Generate a video to attach to a post via the configured Kie.ai provider (Seedance 2.0 / Veo 3.1).
The model itself is fixed in Settings > AI Provider > Video; you only choose mode + aspect ratio + (optionally) the reference image.

When to use:
- The user explicitly asks for a video.
- The chosen platform requires a video attachment and none was provided.

Mode selection:
- 'T2V' (text-to-video): generate from prompt only. Use when the user has NOT provided an image.
- 'I2V' (image-to-video): animate a reference image. Use when the user provides an image URL or asks to "animate this picture", "make it come alive" etc.

Aspect ratio:
- '1:1' for Instagram feed, generic posts
- '9:16' for Stories, Reels, TikTok, Pinterest verticals
- '16:9' for YouTube, LinkedIn banners, Twitter/X cards
Pick based on the target platform; ask the user when ambiguous.

Note: video generation is slow (can take up to ~10 minutes due to provider polling). Inform the user of the wait when calling this tool.`,
      inputSchema: z.object({
        prompt: z
          .string()
          .min(3)
          .max(2000)
          .describe(
            'Detailed visual description of the desired video — scene, action, mood. The agent enriches this further if enrichPrompt=true.'
          ),
        mode: z
          .enum(['T2V', 'I2V'])
          .describe(
            "'T2V' = text-to-video (no image), 'I2V' = animate a reference image (referenceImageUrl required)."
          ),
        referenceImageUrl: z
          .string()
          .url()
          .optional()
          .describe(
            'Public URL of the reference image. REQUIRED when mode=I2V; ignored when mode=T2V.'
          ),
        aspectRatio: z
          .enum(['1:1', '9:16', '16:9'])
          .describe(
            "Target aspect ratio. 1:1 = Instagram feed, 9:16 = Stories/Reels/TikTok, 16:9 = YouTube/LinkedIn."
          ),
        enrichPrompt: z
          .boolean()
          .optional()
          .describe(
            'When true (default), the prompt passes through a TEXT model that adds cinematography details (camera moves, lighting, pacing). Best-effort: if TEXT is not configured the original prompt is used.'
          ),
      }),
      outputSchema: z.object({
        id: z.string(),
        path: z.string(),
      }),
      execute: async (input: any, options: any) => {
        checkAuth(input, options);
        const requestContext = readRequestContext(options);
        const org = JSON.parse(requestContext.get('organization') as string);
        const profileId = requestContext.get('profileId') as
          | string
          | undefined;

        return this._mediaService.generateAiVideo(
          org,
          {
            prompt: input.prompt,
            mode: input.mode,
            referenceImageUrl: input.referenceImageUrl,
            aspectRatio: input.aspectRatio,
            enrichPrompt: input.enrichPrompt,
          },
          profileId
        );
      },
    });
  }
}
