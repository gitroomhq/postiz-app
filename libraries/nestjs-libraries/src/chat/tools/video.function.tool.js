import { __awaiter, __decorate, __metadata } from "tslib";
import { createTool } from '@mastra/core/tools';
import { Injectable } from '@nestjs/common';
import { VideoManager } from "../../videos/video.manager";
import z from 'zod';
import { ModuleRef } from '@nestjs/core';
import { checkAuth } from "../auth.context";
let VideoFunctionTool = class VideoFunctionTool {
    constructor(_videoManagerService, _moduleRef) {
        this._videoManagerService = _videoManagerService;
        this._moduleRef = _moduleRef;
        this.name = 'videoFunctionTool';
    }
    run() {
        return createTool({
            id: 'videoFunctionTool',
            description: `Sometimes when we want to generate videos we might need to get some additional information like voice_id, etc`,
            inputSchema: z.object({
                identifier: z.string(),
                functionName: z.string(),
            }),
            execute: (args, options) => __awaiter(this, void 0, void 0, function* () {
                const { context, runtimeContext } = args;
                checkAuth(args, options);
                const videos = this._videoManagerService.getAllVideos();
                const findVideo = videos.find((p) => p.identifier === context.identifier &&
                    p.tools.some((p) => p.functionName === context.functionName));
                if (!findVideo) {
                    return { error: 'Function not found' };
                }
                const func = yield this._moduleRef
                    // @ts-ignore
                    .get(findVideo.target, { strict: false })[context.functionName]();
                return func;
            }),
        });
    }
};
VideoFunctionTool = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [VideoManager,
        ModuleRef])
], VideoFunctionTool);
export { VideoFunctionTool };
//# sourceMappingURL=video.function.tool.js.map