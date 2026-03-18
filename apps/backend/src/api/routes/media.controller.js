import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Body, Controller, Delete, Get, Param, Post, Query, Req, Res, UploadedFile, UseInterceptors, UsePipes, } from '@nestjs/common';
import { GetOrgFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/org.from.request";
import { MediaService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/media/media.service";
import { ApiTags } from '@nestjs/swagger';
import handleR2Upload from "../../../../../libraries/nestjs-libraries/src/upload/r2.uploader";
import { FileInterceptor } from '@nestjs/platform-express';
import { CustomFileValidationPipe } from "../../../../../libraries/nestjs-libraries/src/upload/custom.upload.validation";
import { SubscriptionService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/subscriptions/subscription.service";
import { UploadFactory } from "../../../../../libraries/nestjs-libraries/src/upload/upload.factory";
import { SaveMediaInformationDto } from "../../../../../libraries/nestjs-libraries/src/dtos/media/save.media.information.dto";
import { VideoDto } from "../../../../../libraries/nestjs-libraries/src/dtos/videos/video.dto";
import { VideoFunctionDto } from "../../../../../libraries/nestjs-libraries/src/dtos/videos/video.function.dto";
let MediaController = class MediaController {
    constructor(_mediaService, _subscriptionService) {
        this._mediaService = _mediaService;
        this._subscriptionService = _subscriptionService;
        this.storage = UploadFactory.createStorage();
    }
    deleteMedia(org, id) {
        return this._mediaService.deleteMedia(org.id, id);
    }
    generateVideo(org, body) {
        console.log('hello');
        return this._mediaService.generateVideo(org, body);
    }
    generateImage(org_1, req_1, prompt_1) {
        return __awaiter(this, arguments, void 0, function* (org, req, prompt, isPicturePrompt = false) {
            const total = yield this._subscriptionService.checkCredits(org);
            if (process.env.STRIPE_PUBLISHABLE_KEY && total.credits <= 0) {
                return false;
            }
            return {
                output: (isPicturePrompt ? '' : 'data:image/png;base64,') +
                    (yield this._mediaService.generateImage(prompt, org, isPicturePrompt)),
            };
        });
    }
    generateImageFromText(org, req, prompt) {
        return __awaiter(this, void 0, void 0, function* () {
            const image = yield this.generateImage(org, req, prompt, true);
            if (!image) {
                return false;
            }
            const file = yield this.storage.uploadSimple(image.output);
            return this._mediaService.saveFile(org.id, file.split('/').pop(), file);
        });
    }
    uploadServer(org, file) {
        return __awaiter(this, void 0, void 0, function* () {
            const originalName = (file === null || file === void 0 ? void 0 : file.originalname) || '';
            const uploadedFile = yield this.storage.uploadFile(file);
            return this._mediaService.saveFile(org.id, uploadedFile.originalname, uploadedFile.path, originalName);
        });
    }
    saveMedia(org, req, name, originalName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!name) {
                return false;
            }
            return this._mediaService.saveFile(org.id, name, process.env.CLOUDFLARE_BUCKET_URL + '/' + name, originalName || undefined);
        });
    }
    saveMediaInformation(org, body) {
        return this._mediaService.saveMediaInformation(org.id, body);
    }
    uploadSimple(org_1, file_1) {
        return __awaiter(this, arguments, void 0, function* (org, file, preventSave = 'false') {
            const originalName = file.originalname;
            const getFile = yield this.storage.uploadFile(file);
            if (preventSave === 'true') {
                const { path } = getFile;
                return { path };
            }
            return this._mediaService.saveFile(org.id, getFile.originalname, getFile.path, originalName);
        });
    }
    uploadFile(org, req, res, endpoint) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const upload = yield handleR2Upload(endpoint, req, res);
            if (endpoint !== 'complete-multipart-upload') {
                return upload;
            }
            // @ts-ignore
            const name = upload.Location.split('/').pop();
            const originalName = (_b = (_a = req.body) === null || _a === void 0 ? void 0 : _a.file) === null || _b === void 0 ? void 0 : _b.name;
            const saveFile = yield this._mediaService.saveFile(org.id, name, 
            // @ts-ignore
            upload.Location, originalName || undefined);
            res.status(200).json(Object.assign(Object.assign({}, upload), { saved: saveFile }));
        });
    }
    getMedia(org, page) {
        return this._mediaService.getMedia(org.id, page);
    }
    getVideos() {
        return this._mediaService.getVideoOptions();
    }
    videoFunction(body) {
        return this._mediaService.videoFunction(body.identifier, body.functionName, body.params);
    }
    generateVideoAllowed(org, type) {
        return this._mediaService.generateVideoAllowed(org, type);
    }
};
__decorate([
    Delete('/:id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "deleteMedia", null);
__decorate([
    Post('/generate-video'),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, VideoDto]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "generateVideo", null);
__decorate([
    Post('/generate-image'),
    __param(0, GetOrgFromRequest()),
    __param(1, Req()),
    __param(2, Body('prompt')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "generateImage", null);
__decorate([
    Post('/generate-image-with-prompt'),
    __param(0, GetOrgFromRequest()),
    __param(1, Req()),
    __param(2, Body('prompt')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "generateImageFromText", null);
__decorate([
    Post('/upload-server'),
    UseInterceptors(FileInterceptor('file')),
    UsePipes(new CustomFileValidationPipe()),
    __param(0, GetOrgFromRequest()),
    __param(1, UploadedFile()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "uploadServer", null);
__decorate([
    Post('/save-media'),
    __param(0, GetOrgFromRequest()),
    __param(1, Req()),
    __param(2, Body('name')),
    __param(3, Body('originalName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "saveMedia", null);
__decorate([
    Post('/information'),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, SaveMediaInformationDto]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "saveMediaInformation", null);
__decorate([
    Post('/upload-simple'),
    UseInterceptors(FileInterceptor('file')),
    __param(0, GetOrgFromRequest()),
    __param(1, UploadedFile('file')),
    __param(2, Body('preventSave')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "uploadSimple", null);
__decorate([
    Post('/:endpoint'),
    __param(0, GetOrgFromRequest()),
    __param(1, Req()),
    __param(2, Res()),
    __param(3, Param('endpoint')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, String]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "uploadFile", null);
__decorate([
    Get('/'),
    __param(0, GetOrgFromRequest()),
    __param(1, Query('page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "getMedia", null);
__decorate([
    Get('/video-options'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "getVideos", null);
__decorate([
    Post('/video/function'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VideoFunctionDto]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "videoFunction", null);
__decorate([
    Get('/generate-video/:type/allowed'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "generateVideoAllowed", null);
MediaController = __decorate([
    ApiTags('Media'),
    Controller('/media'),
    __metadata("design:paramtypes", [MediaService,
        SubscriptionService])
], MediaController);
export { MediaController };
//# sourceMappingURL=media.controller.js.map