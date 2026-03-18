import { __awaiter, __decorate, __metadata } from "tslib";
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { MediaService } from "../../database/prisma/media/media.service";
import { UploadFactory } from "../../upload/upload.factory";
import { checkAuth } from "../auth.context";
let GenerateImageTool = class GenerateImageTool {
    constructor(_mediaService) {
        this._mediaService = _mediaService;
        this.storage = UploadFactory.createStorage();
        this.name = 'generateImageTool';
    }
    run() {
        return createTool({
            id: 'generateImageTool',
            description: `Generate image to use in a post,
                    in case the user specified a platform that requires attachment and attachment was not provided,
                    ask if they want to generate a picture of a video.
      `,
            inputSchema: z.object({
                prompt: z.string(),
            }),
            outputSchema: z.object({
                id: z.string(),
                path: z.string(),
            }),
            execute: (args, options) => __awaiter(this, void 0, void 0, function* () {
                const { context, runtimeContext } = args;
                checkAuth(args, options);
                // @ts-ignore
                const org = JSON.parse(runtimeContext.get('organization'));
                const image = yield this._mediaService.generateImage(context.prompt, org);
                const file = yield this.storage.uploadSimple('data:image/png;base64,' + image);
                return this._mediaService.saveFile(org.id, file.split('/').pop(), file);
            }),
        });
    }
};
GenerateImageTool = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [MediaService])
], GenerateImageTool);
export { GenerateImageTool };
//# sourceMappingURL=generate.image.tool.js.map