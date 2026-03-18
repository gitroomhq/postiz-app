import { __awaiter, __decorate, __metadata } from "tslib";
import { HttpException, Injectable } from '@nestjs/common';
import { MediaRepository } from "./media.repository";
import { OpenaiService } from "../../../openai/openai.service";
import { SubscriptionService } from "../subscriptions/subscription.service";
import { VideoManager } from "../../../videos/video.manager";
import { UploadFactory } from "../../../upload/upload.factory";
import { AuthorizationActions, Sections, SubscriptionException, } from "../../../../../../apps/backend/src/services/auth/permissions/permission.exception.class";
let MediaService = class MediaService {
    constructor(_mediaRepository, _openAi, _subscriptionService, _videoManager) {
        this._mediaRepository = _mediaRepository;
        this._openAi = _openAi;
        this._subscriptionService = _subscriptionService;
        this._videoManager = _videoManager;
        this.storage = UploadFactory.createStorage();
    }
    deleteMedia(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._mediaRepository.deleteMedia(org, id);
        });
    }
    getMediaById(id) {
        return this._mediaRepository.getMediaById(id);
    }
    generateImage(prompt, org, generatePromptFirst) {
        return __awaiter(this, void 0, void 0, function* () {
            const generating = yield this._subscriptionService.useCredit(org, 'ai_images', () => __awaiter(this, void 0, void 0, function* () {
                if (generatePromptFirst) {
                    prompt = yield this._openAi.generatePromptForPicture(prompt);
                    console.log('Prompt:', prompt);
                }
                return this._openAi.generateImage(prompt, !!generatePromptFirst);
            }));
            return generating;
        });
    }
    saveFile(org, fileName, filePath, originalName) {
        return this._mediaRepository.saveFile(org, fileName, filePath, originalName);
    }
    getMedia(org, page) {
        return this._mediaRepository.getMedia(org, page);
    }
    saveMediaInformation(org, data) {
        return this._mediaRepository.saveMediaInformation(org, data);
    }
    getVideoOptions() {
        return this._videoManager.getAllVideos();
    }
    generateVideoAllowed(org, type) {
        return __awaiter(this, void 0, void 0, function* () {
            const video = this._videoManager.getVideoByName(type);
            if (!video) {
                throw new Error(`Video type ${type} not found`);
            }
            if (!video.trial && org.isTrailing) {
                throw new HttpException('This video is not available in trial mode', 406);
            }
            return true;
        });
    }
    generateVideo(org, body) {
        return __awaiter(this, void 0, void 0, function* () {
            const totalCredits = yield this._subscriptionService.checkCredits(org, 'ai_videos');
            if (totalCredits.credits <= 0) {
                throw new SubscriptionException({
                    action: AuthorizationActions.Create,
                    section: Sections.VIDEOS_PER_MONTH,
                });
            }
            const video = this._videoManager.getVideoByName(body.type);
            if (!video) {
                throw new Error(`Video type ${body.type} not found`);
            }
            if (!video.trial && org.isTrailing) {
                throw new HttpException('This video is not available in trial mode', 406);
            }
            console.log(body.customParams);
            yield video.instance.processAndValidate(body.customParams);
            console.log('no err');
            return yield this._subscriptionService.useCredit(org, 'ai_videos', () => __awaiter(this, void 0, void 0, function* () {
                const loadedData = yield video.instance.process(body.output, body.customParams);
                const file = yield this.storage.uploadSimple(loadedData);
                return this.saveFile(org.id, file.split('/').pop(), file);
            }));
        });
    }
    videoFunction(identifier, functionName, body) {
        return __awaiter(this, void 0, void 0, function* () {
            const video = this._videoManager.getVideoByName(identifier);
            if (!video) {
                throw new Error(`Video with identifier ${identifier} not found`);
            }
            // @ts-ignore
            const functionToCall = video.instance[functionName];
            if (typeof functionToCall !== 'function' ||
                this._videoManager.checkAvailableVideoFunction(functionToCall)) {
                throw new HttpException(`Function ${functionName} not found on video instance`, 400);
            }
            return functionToCall(body);
        });
    }
};
MediaService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [MediaRepository,
        OpenaiService,
        SubscriptionService,
        VideoManager])
], MediaService);
export { MediaService };
//# sourceMappingURL=media.service.js.map