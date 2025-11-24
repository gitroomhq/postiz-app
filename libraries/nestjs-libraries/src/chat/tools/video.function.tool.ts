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
      inputSchema: z.object({
        identifier: z.string(),
        functionName: z.string(),
      }),
      execute: async (args, options) => {
        const { context, runtimeContext } = args;
        checkAuth(args, options);
        const videos = this._videoManagerService.getAllVideos();
        const findVideo = videos.find(
          (p) =>
            p.identifier === context.identifier &&
            p.tools.some((p) => p.functionName === context.functionName)
        );

        if (!findVideo) {
          return { error: 'Function not found' };
        }

        const func = await this._moduleRef
          // @ts-ignore
          .get(findVideo.target, { strict: false })
          [context.functionName]();
        return func;
      },
    });
  }
}
