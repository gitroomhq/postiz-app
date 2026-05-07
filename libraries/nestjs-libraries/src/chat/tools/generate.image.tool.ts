import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { UploadFactory } from '@gitroom/nestjs-libraries/upload/upload.factory';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { readRequestContext } from '@gitroom/nestjs-libraries/chat/tools/tool.context.helper';

@Injectable()
export class GenerateImageTool implements AgentToolInterface {
  private storage = UploadFactory.createStorage();

  constructor(private _mediaService: MediaService) {}
  name = 'generateImageTool';

  run() {
    return createTool({
      id: 'generateImageTool',
      description: `Generate an image to attach to a post.
- Use when the user asks for an image, or when the chosen platform requires an attachment and none was provided.
- ALWAYS pass 'aspectRatio' explicitly. Pick the best fit for the target platform:
  - "1:1" (square) — Instagram feed, generic posts
  - "9:16" (vertical) — Instagram Stories, Reels, TikTok, Pinterest verticals
  - "16:9" (horizontal) — YouTube thumbnails, LinkedIn banners, Twitter/X cards
- If the user explicitly requests a ratio (e.g. "vertical", "stories format", "9:16"), respect it.
- If the user does not specify and the platform is ambiguous, ask before generating.
`,
      inputSchema: z.object({
        prompt: z
          .string()
          .describe('Detailed visual description for the image to generate.'),
        aspectRatio: z
          .enum(['1:1', '9:16', '16:9'])
          .describe(
            "Target aspect ratio. '1:1' square, '9:16' vertical (Stories/Reels/TikTok), '16:9' horizontal (YouTube/LinkedIn banners)."
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
        const personaRaw = requestContext.get('persona') as string;
        const profileId = requestContext.get('profileId') as string | undefined;
        let styledPrompt = input.prompt;
        if (personaRaw) {
          try {
            const persona = JSON.parse(personaRaw);
            if (persona?.imageStyle) {
              styledPrompt = `Style: ${persona.imageStyle}. ${input.prompt}`;
            }
          } catch {
            // ignore persona parse errors
          }
        }
        const image = await this._mediaService.generateImage(
          styledPrompt,
          org,
          false,
          profileId,
          input.aspectRatio
        );

        const file = await this.storage.uploadSimple(
          'data:image/png;base64,' + image
        );

        return this._mediaService.saveFile(
          org.id,
          file.split('/').pop(),
          file,
          undefined,
          profileId
        );
      },
    });
  }
}
