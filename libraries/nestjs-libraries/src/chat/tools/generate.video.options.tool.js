import { __awaiter, __decorate, __metadata } from "tslib";
import { createTool } from '@mastra/core/tools';
import { Injectable } from '@nestjs/common';
import { getValidationSchemas } from "../validation.schemas.helper";
import { VideoManager } from "../../videos/video.manager";
import z from 'zod';
import { checkAuth } from "../auth.context";
let GenerateVideoOptionsTool = class GenerateVideoOptionsTool {
    constructor(_videoManagerService) {
        this._videoManagerService = _videoManagerService;
        this.name = 'generateVideoOptions';
    }
    run() {
        return createTool({
            id: 'generateVideoOptions',
            description: `All the options to generate videos, some tools might require another call to generateVideoFunction`,
            outputSchema: z.object({
                video: z.array(z.object({
                    type: z.string(),
                    output: z.string(),
                    tools: z.array(z.object({
                        functionName: z.string(),
                        output: z.string(),
                    })),
                    customParams: z.any(),
                })),
            }),
            execute: (args, options) => __awaiter(this, void 0, void 0, function* () {
                const { context, runtimeContext } = args;
                checkAuth(args, options);
                const videos = this._videoManagerService.getAllVideos();
                console.log(JSON.stringify({
                    video: videos.map((p) => {
                        return {
                            type: p.identifier,
                            output: 'vertical|horizontal',
                            tools: p.tools,
                            customParams: getValidationSchemas()[p.dto.name],
                        };
                    }),
                }, null, 2));
                return {
                    video: videos.map((p) => {
                        return {
                            type: p.identifier,
                            output: 'vertical|horizontal',
                            tools: p.tools,
                            customParams: getValidationSchemas()[p.dto.name],
                        };
                    }),
                };
            }),
        });
    }
};
GenerateVideoOptionsTool = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [VideoManager])
], GenerateVideoOptionsTool);
export { GenerateVideoOptionsTool };
//# sourceMappingURL=generate.video.options.tool.js.map