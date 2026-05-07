import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import {
  IntegrationManager,
  socialIntegrationList,
} from '@gitroom/nestjs-libraries/integrations/integration.manager';
import { IntegrationService } from '@gitroom/nestjs-libraries/database/prisma/integrations/integration.service';
import { RefreshToken } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import { timer } from '@gitroom/helpers/utils/timer';
import { MediaService } from '@gitroom/nestjs-libraries/database/prisma/media/media.service';
import { OrganizationService } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.service';
import { VideoManager } from '@gitroom/nestjs-libraries/videos/video.manager';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';
import { readRequestContext } from '@gitroom/nestjs-libraries/chat/tools/tool.context.helper';

@Injectable()
export class GenerateVideoTool implements AgentToolInterface {
  constructor(
    private _mediaService: MediaService,
    private _videoManager: VideoManager
  ) {}
  name = 'generateVideoTool';

  run() {
    return createTool({
      id: 'generateVideoTool',
      description: `Generate video to use in a post,
                    in case the user specified a platform that requires attachment and attachment was not provided,
                    ask if they want to generate a picture of a video.
                    In many cases 'videoFunctionTool' will need to be called first, to get things like voice id
                    Here are the type of video that can be generated:
                    ${this._videoManager
                      .getAllVideos()
                      .map((p) => "-" + p.title)
                      .join('\n')}
      `,
      inputSchema: z.object({
        identifier: z.string(),
        output: z.enum(['vertical', 'horizontal']),
        customParams: z.array(
          z.object({
            key: z.string().describe('Name of the settings key to pass'),
            value: z.any().describe('Value of the key'),
          })
        ),
      }),
      outputSchema: z.object({
        url: z.string(),
      }),
      execute: async (input: any, options: any) => {
        checkAuth(input, options);
        const requestContext = readRequestContext(options);
        const org = JSON.parse(requestContext.get('organization') as string);
        const value = await this._mediaService.generateVideo(org, {
          type: input.identifier,
          output: input.output,
          customParams: input.customParams.reduce(
            (all: any, current: any) => ({
              ...all,
              [current.key]: current.value,
            }),
            {}
          ),
        });

        return {
          url: value.path,
        };
      },
    });
  }
}
