import { __awaiter, __decorate, __rest } from "tslib";
import { Injectable } from '@nestjs/common';
import pLimit from 'p-limit';
const limit = pLimit(10);
let FalService = class FalService {
    generateImageFromText(model_1, text_1) {
        return __awaiter(this, arguments, void 0, function* (model, text, isVertical = false) {
            const _a = yield (yield limit(() => fetch(`https://fal.run/fal-ai/${model}`, {
                method: 'POST',
                headers: {
                    Authorization: `Key ${process.env.FAL_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: text,
                    aspect_ratio: isVertical ? '9:16' : '16:9',
                    resolution: '720p',
                    num_images: 1,
                    output_format: 'jpeg',
                    expand_prompt: true,
                }),
            }))).json(), { images, video } = _a, all = __rest(_a, ["images", "video"]);
            console.log(all, video, images);
            if (video) {
                return video.url;
            }
            return images[0].url;
        });
    }
};
FalService = __decorate([
    Injectable()
], FalService);
export { FalService };
//# sourceMappingURL=fal.service.js.map