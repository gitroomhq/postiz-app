import { __awaiter, __decorate, __metadata } from "tslib";
import { Video, VideoAbstract, } from "../video.interface";
import { timer } from "../../../../helpers/src/utils/timer";
import { ArrayMaxSize, IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
class Image {
}
__decorate([
    IsString(),
    __metadata("design:type", String)
], Image.prototype, "id", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], Image.prototype, "path", void 0);
class Veo3Params {
}
__decorate([
    IsString(),
    __metadata("design:type", String)
], Veo3Params.prototype, "prompt", void 0);
__decorate([
    Type(() => Image),
    ValidateNested({ each: true }),
    IsArray(),
    ArrayMaxSize(3),
    __metadata("design:type", Array)
], Veo3Params.prototype, "images", void 0);
let Veo3 = class Veo3 extends VideoAbstract {
    constructor() {
        super(...arguments);
        this.dto = Veo3Params;
    }
    process(output, customParams) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const value = yield (yield fetch('https://api.kie.ai/api/v1/veo/generate', {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.KIEAI_API_KEY}`,
                },
                method: 'POST',
                body: JSON.stringify({
                    prompt: customParams.prompt,
                    imageUrls: ((_a = customParams === null || customParams === void 0 ? void 0 : customParams.images) === null || _a === void 0 ? void 0 : _a.map((p) => p.path)) || [],
                    model: 'veo3_fast',
                    aspectRatio: output === 'horizontal' ? '16:9' : '9:16',
                }),
            })).json();
            if (value.code !== 200 && value.code !== 201) {
                throw new Error(`Failed to generate video`);
            }
            const taskId = value.data.taskId;
            let videoUrl = [];
            while (videoUrl.length === 0) {
                console.log('waiting for video to be ready');
                const data = yield (yield fetch('https://api.kie.ai/api/v1/veo/record-info?taskId=' + taskId, {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${process.env.KIEAI_API_KEY}`,
                    },
                })).json();
                if (data.code !== 200 && data.code !== 400) {
                    throw new Error(`Failed to get video info`);
                }
                videoUrl = ((_c = (_b = data === null || data === void 0 ? void 0 : data.data) === null || _b === void 0 ? void 0 : _b.response) === null || _c === void 0 ? void 0 : _c.resultUrls) || [];
                yield timer(10000);
            }
            return videoUrl[0];
        });
    }
};
Veo3 = __decorate([
    Video({
        identifier: 'veo3',
        title: 'Veo3 (Audio + Video)',
        description: 'Generate videos with the most advanced video model.',
        placement: 'text-to-image',
        dto: Veo3Params,
        tools: [],
        trial: false,
        available: !!process.env.KIEAI_API_KEY,
    })
], Veo3);
export { Veo3 };
//# sourceMappingURL=veo3.js.map