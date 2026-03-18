import { __decorate } from "tslib";
import { Global, Module } from '@nestjs/common';
import { ImagesSlides } from "./images-slides/images.slides";
import { VideoManager } from "./video.manager";
import { Veo3 } from "./veo3/veo3";
let VideoModule = class VideoModule {
};
VideoModule = __decorate([
    Global(),
    Module({
        providers: [ImagesSlides, Veo3, VideoManager],
        get exports() {
            return this.providers;
        },
    })
], VideoModule);
export { VideoModule };
//# sourceMappingURL=video.module.js.map