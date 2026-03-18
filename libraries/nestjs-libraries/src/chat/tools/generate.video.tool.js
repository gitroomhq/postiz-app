import { __awaiter, __decorate, __metadata } from "tslib";
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { MediaService } from "../../database/prisma/media/media.service";
import { VideoManager } from "../../videos/video.manager";
import { checkAuth } from "../auth.context";
let GenerateVideoTool = class GenerateVideoTool {
    constructor(_mediaService, _videoManager) {
        this._mediaService = _mediaService;
        this._videoManager = _videoManager;
        this.name = 'generateVideoTool';
    }
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
                customParams: z.array(z.object({
                    key: z.string().describe('Name of the settings key to pass'),
                    value: z.any().describe('Value of the key'),
                })),
            }),
            outputSchema: z.object({
                url: z.string(),
            }),
            execute: (args, options) => __awaiter(this, void 0, void 0, function* () {
                const { context, runtimeContext } = args;
                checkAuth(args, options);
                // @ts-ignore
                const org = JSON.parse(runtimeContext.get('organization'));
                const value = yield this._mediaService.generateVideo(org, {
                    type: context.identifier,
                    output: context.output,
                    customParams: context.customParams.reduce((all, current) => (Object.assign(Object.assign({}, all), { [current.key]: current.value })), {}),
                });
                return {
                    url: value.path,
                };
            }),
        });
    }
};
GenerateVideoTool = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [MediaService,
        VideoManager])
], GenerateVideoTool);
export { GenerateVideoTool };
//# sourceMappingURL=generate.video.tool.js.map