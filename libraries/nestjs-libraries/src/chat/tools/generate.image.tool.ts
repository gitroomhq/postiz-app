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
      description: `Generate an image to attach to a post via the configured Image provider (gpt-image-2 / Gemini Nano Banana / Flux / etc).

When to use:
- The user asks for an image.
- The chosen platform requires an image attachment and none was provided.

Mode selection:
- 'T2I' (text-to-image): generate from prompt only. Use when the user has NOT provided an image URL.
- 'I2I' (image-to-image): transform a reference image. Use when the user provides an image URL or asks to "edit", "restyle", "transform", "make this look like X".

Aspect ratio:
- '1:1' for Instagram feed, generic posts
- '9:16' for Stories, Reels, TikTok, Pinterest verticals
- '16:9' for YouTube thumbnails, LinkedIn banners, Twitter/X cards
Pick based on the target platform; ask the user when ambiguous.

Style (optional): pass 'Realistic', 'Cartoon', 'Anime', 'Cyberpunk' etc when the user explicitly mentioned a style. Skip this field when no style is requested.

manualPrompt: keep default (false) unless the user gave you a fully crafted prompt and asked to send it as-is. When false, the prompt is enriched by an LLM with cinematography details (camera, lighting, mood) before going to the image model.`,
      inputSchema: z.object({
        prompt: z
          .string()
          .describe(
            'Visual description (text-to-image) OR transformation hint (image-to-image).'
          ),
        mode: z
          .enum(['T2I', 'I2I'])
          .describe(
            "'T2I' = text-to-image (no reference image). 'I2I' = image-to-image (transform a reference). Use 'I2I' when the user provides an image URL or asks to edit/restyle/transform an existing image."
          ),
        referenceImageUrl: z
          .string()
          .url()
          .optional()
          .describe(
            'Required when mode=I2I. Public http(s) URL of the reference image. Ignored when mode=T2I.'
          ),
        aspectRatio: z
          .enum(['1:1', '9:16', '16:9'])
          .describe(
            "Target aspect ratio. 1:1 = Instagram feed, 9:16 = Stories/Reels/TikTok, 16:9 = YouTube/LinkedIn."
          ),
        style: z
          .string()
          .optional()
          .describe(
            'Optional style hint (e.g. "Realistic", "Cartoon", "Cyberpunk"). Skip when no style was requested.'
          ),
        manualPrompt: z
          .boolean()
          .optional()
          .describe(
            'When true, the prompt goes raw to the image model (no LLM enrichment). Default false. Set true only if the user provided a fully crafted prompt and asked to use it as-is.'
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

        // Persona (imageStyle) e style do agente sao concatenados no prompt
        // antes de mandar pro service. Quando manualPrompt=true, o
        // service nao enriquece, mas a persona e o style ainda sao
        // injetados para preservar identidade de marca.
        const parts: string[] = [];
        if (input.style) parts.push(`Style: ${input.style}.`);
        if (personaRaw) {
          try {
            const persona = JSON.parse(personaRaw);
            if (persona?.imageStyle) {
              parts.push(`Image style: ${persona.imageStyle}.`);
            }
          } catch {
            // ignore persona parse errors
          }
        }
        const styledPrompt = parts.length
          ? `${parts.join(' ')} ${input.prompt}`
          : input.prompt;

        const image = await this._mediaService.generateImage(
          styledPrompt,
          org,
          !input.manualPrompt /* generatePromptFirst: invertido de manualPrompt */,
          profileId,
          input.aspectRatio,
          {
            mode: input.mode,
            referenceImageUrl: input.referenceImageUrl,
          }
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
