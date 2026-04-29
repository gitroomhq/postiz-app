import { AgentToolInterface } from '@gitroom/nestjs-libraries/chat/agent.tool.interface';
import { createTool } from '@mastra/core/tools';
import { Injectable } from '@nestjs/common';
import { VideoManager } from '@gitroom/nestjs-libraries/videos/video.manager';
import z from 'zod';
import { ModuleRef } from '@nestjs/core';
import { checkAuth } from '@gitroom/nestjs-libraries/chat/auth.context';

@Injectable()
export class VideoFunctionTool implements AgentToolInterface {
  constructor(
    private _videoManagerService: VideoManager,
    private _moduleRef: ModuleRef
  ) {}
  name = 'videoFunctionTool';

  run() {
    return createTool({
      id: 'videoFunctionTool',
      description: `Sometimes when we want to generate videos we might need to get some additional information like voice_id, etc`,
      mcp: {
        annotations: {
          title: 'Video Function Helper',
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      inputSchema: z.object({
        identifier: z.string(),
        functionName: z.string(),
      }),
      execute: async (inputData, context) => {
        checkAuth(inputData, context);
        const videos = this._videoManagerService.getAllVideos();
        const findVideo = videos.find(
          (p) =>
            p.identifier === inputData.identifier &&
            p.tools.some((p) => p.functionName === inputData.functionName)
        );

        if (!findVideo) {
          return { error: 'Function not found' };
        }

        const func = await this._moduleRef
          // @ts-ignore
          .get(findVideo.target, { strict: false })
          [inputData.functionName]();
        return func;
      },
    });
  }
}
