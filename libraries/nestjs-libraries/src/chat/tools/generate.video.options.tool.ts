import { AgentToolInterface, ToolReturn } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { Injectable } from '@nestjs/common';
import { validationMetadatasToSchemas } from 'class-validator-jsonschema';
import { VideoManager } from '@gitroom/nestjs-libraries/videos/video.manager';
import z from 'zod';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

@Injectable()
export class GenerateVideoOptionsTool implements AgentToolInterface {
  constructor(private _videoManagerService: VideoManager) {}
  name = 'generateVideoOptions';

  run() {
    return createTool({
      id: 'generateVideoOptions',
      description: `All the options to generate videos, some tools might require another call to generateVideoFunction`,
      outputSchema: z.object({
        video: z.array(
          z.object({
            type: z.string(),
            output: z.string(),
            tools: z.array(
              z.object({
                functionName: z.string(),
                output: z.string(),
              })
            ),
            customParams: z.any(),
          })
        ),
      }),
      execute: async (args, options) => {
        const { context, runtimeContext } = args;
        checkAuth(args, options);
        const videos = this._videoManagerService.getAllVideos();
        console.log(
          JSON.stringify(
            {
              video: videos.map((p) => {
                return {
                  type: p.identifier,
                  output: 'vertical|horizontal',
                  tools: p.tools,
                  customParams: validationMetadatasToSchemas()[p.dto.name],
                };
              }),
            },
            null,
            2
          )
        );
        return {
          video: videos.map((p) => {
            return {
              type: p.identifier,
              output: 'vertical|horizontal',
              tools: p.tools,
              customParams: validationMetadatasToSchemas()[p.dto.name],
            };
          }),
        };
      },
    });
  }
}
