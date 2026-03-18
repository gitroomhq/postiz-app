import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Body, Controller, Delete, Get, HttpException, Param, Post, Put, Query, UploadedFile, UseInterceptors, } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetOrgFromRequest } from "../../../../../../libraries/nestjs-libraries/src/user/org.from.request";
import { IntegrationService } from "../../../../../../libraries/nestjs-libraries/src/database/prisma/integrations/integration.service";
import { CheckPolicies } from "../../../services/auth/permissions/permissions.ability";
import { PostsService } from "../../../../../../libraries/nestjs-libraries/src/database/prisma/posts/posts.service";
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadFactory } from "../../../../../../libraries/nestjs-libraries/src/upload/upload.factory";
import { MediaService } from "../../../../../../libraries/nestjs-libraries/src/database/prisma/media/media.service";
import { GetPostsDto } from "../../../../../../libraries/nestjs-libraries/src/dtos/posts/get.posts.dto";
import { AuthorizationActions, Sections, } from "../../../services/auth/permissions/permission.exception.class";
import { VideoDto } from "../../../../../../libraries/nestjs-libraries/src/dtos/videos/video.dto";
import { VideoFunctionDto } from "../../../../../../libraries/nestjs-libraries/src/dtos/videos/video.function.dto";
import { UploadDto } from "../../../../../../libraries/nestjs-libraries/src/dtos/media/upload.dto";
import { NotificationService } from "../../../../../../libraries/nestjs-libraries/src/database/prisma/notifications/notification.service";
import { GetNotificationsDto } from "../../../../../../libraries/nestjs-libraries/src/dtos/notifications/get.notifications.dto";
import axios from 'axios';
import { Readable } from 'stream';
import { lookup, extension } from 'mime-types';
import * as Sentry from '@sentry/nestjs';
import { socialIntegrationList, IntegrationManager } from "../../../../../../libraries/nestjs-libraries/src/integrations/integration.manager";
import { getValidationSchemas } from "../../../../../../libraries/nestjs-libraries/src/chat/validation.schemas.helper";
import { RefreshIntegrationService } from "../../../../../../libraries/nestjs-libraries/src/integrations/refresh.integration.service";
import { RefreshToken } from "../../../../../../libraries/nestjs-libraries/src/integrations/social.abstract";
import { timer } from "../../../../../../libraries/helpers/src/utils/timer";
import { ioRedis } from "../../../../../../libraries/nestjs-libraries/src/redis/redis.service";
let PublicIntegrationsController = class PublicIntegrationsController {
    constructor(_integrationService, _postsService, _mediaService, _notificationService, _integrationManager, _refreshIntegrationService) {
        this._integrationService = _integrationService;
        this._postsService = _postsService;
        this._mediaService = _mediaService;
        this._notificationService = _notificationService;
        this._integrationManager = _integrationManager;
        this._refreshIntegrationService = _refreshIntegrationService;
        this.storage = UploadFactory.createStorage();
    }
    uploadSimple(org, file) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            if (!file) {
                throw new HttpException({ msg: 'No file provided' }, 400);
            }
            const getFile = yield this.storage.uploadFile(file);
            return this._mediaService.saveFile(org.id, getFile.originalname, getFile.path);
        });
    }
    uploadsFromUrl(org, body) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            Sentry.metrics.count('public_api-request', 1);
            const response = yield axios.get(body.url, {
                responseType: 'arraybuffer',
            });
            const buffer = Buffer.from(response.data);
            const responseMime = (_c = (_b = (_a = response.headers) === null || _a === void 0 ? void 0 : _a['content-type']) === null || _b === void 0 ? void 0 : _b.split(';')[0]) === null || _c === void 0 ? void 0 : _c.trim();
            const urlMime = lookup((_f = (_e = (_d = body === null || body === void 0 ? void 0 : body.url) === null || _d === void 0 ? void 0 : _d.split) === null || _e === void 0 ? void 0 : _e.call(_d, '?')) === null || _f === void 0 ? void 0 : _f[0]);
            const mimetype = (urlMime || responseMime || 'image/jpeg');
            const ext = extension(mimetype) || 'jpg';
            const getFile = yield this.storage.uploadFile({
                buffer,
                mimetype,
                size: buffer.length,
                path: '',
                fieldname: '',
                destination: '',
                stream: new Readable(),
                filename: '',
                originalname: `upload.${ext}`,
                encoding: '',
            });
            return this._mediaService.saveFile(org.id, getFile.originalname, getFile.path);
        });
    }
    findSlotIntegration(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            return { date: yield this._postsService.findFreeDateTime(org.id, id) };
        });
    }
    getPosts(org, query) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            const posts = yield this._postsService.getPosts(org.id, query);
            return {
                posts,
                // comments,
            };
        });
    }
    createPost(org, rawBody) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            const body = yield this._postsService.mapTypeToPost(rawBody, org.id, rawBody.type === 'draft');
            body.type = rawBody.type;
            console.log(JSON.stringify(body, null, 2));
            return this._postsService.createPost(org.id, body);
        });
    }
    deletePost(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            const getPostById = yield this._postsService.getPost(org.id, id);
            return this._postsService.deletePost(org.id, getPostById.group);
        });
    }
    deletePostByGroup(org, group) {
        Sentry.metrics.count('public_api-request', 1);
        return this._postsService.deletePost(org.id, group);
    }
    getActiveIntegrations(org) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            return { connected: true };
        });
    }
    listIntegration(org) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            return (yield this._integrationService.getIntegrationsList(org.id)).map((org) => ({
                id: org.id,
                name: org.name,
                identifier: org.providerIdentifier,
                picture: org.picture,
                disabled: org.disabled,
                profile: org.profile,
                customer: org.customer
                    ? {
                        id: org.customer.id,
                        name: org.customer.name,
                    }
                    : undefined,
            }));
        });
    }
    getIntegrationUrl(integration, refresh, org) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            if (!this._integrationManager
                .getAllowedSocialsIntegrations()
                .includes(integration)) {
                throw new HttpException({ msg: 'Integration not allowed' }, 400);
            }
            const integrationProvider = this._integrationManager.getSocialIntegration(integration);
            if (integrationProvider.externalUrl) {
                throw new HttpException({ msg: 'This integration requires an external URL and is not supported via the public API' }, 400);
            }
            try {
                const { codeVerifier, state, url } = yield integrationProvider.generateAuthUrl();
                if (refresh) {
                    yield ioRedis.set(`refresh:${state}`, refresh, 'EX', 3600);
                }
                yield ioRedis.set(`organization:${state}`, org.id, 'EX', 3600);
                yield ioRedis.set(`login:${state}`, codeVerifier, 'EX', 3600);
                return { url };
            }
            catch (err) {
                throw new HttpException({ msg: 'Failed to generate auth URL' }, 500);
            }
        });
    }
    getNotifications(org, query) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            Sentry.metrics.count('public_api-request', 1);
            return this._notificationService.getNotificationsPaginated(org.id, (_a = query.page) !== null && _a !== void 0 ? _a : 0);
        });
    }
    generateVideo(org, body) {
        Sentry.metrics.count('public_api-request', 1);
        return this._mediaService.generateVideo(org, body);
    }
    videoFunction(body) {
        Sentry.metrics.count('public_api-request', 1);
        return this._mediaService.videoFunction(body.identifier, body.functionName, body.params);
    }
    deleteChannel(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            const isTherePosts = yield this._integrationService.getPostsForChannel(org.id, id);
            if (isTherePosts.length) {
                for (const post of isTherePosts) {
                    this._postsService.deletePost(org.id, post.group).catch(() => { });
                }
            }
            return this._integrationService.deleteChannel(org.id, id);
        });
    }
    getIntegrationSettings(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            Sentry.metrics.count('public_api-request', 1);
            const loadIntegration = yield this._integrationService.getIntegrationById(org.id, id);
            const verified = ((_b = (_a = JSON.parse(loadIntegration.additionalSettings || '[]')) === null || _a === void 0 ? void 0 : _a.find((p) => (p === null || p === void 0 ? void 0 : p.title) === 'Verified')) === null || _b === void 0 ? void 0 : _b.value) || false;
            const integration = socialIntegrationList.find((p) => p.identifier === loadIntegration.providerIdentifier);
            if (!integration) {
                return {
                    output: { rules: '', maxLength: 0, settings: {}, tools: [] },
                };
            }
            const maxLength = integration.maxLength(verified);
            const schemas = !integration.dto
                ? false
                : getValidationSchemas()[integration.dto.name];
            const tools = this._integrationManager.getAllTools();
            const rules = this._integrationManager.getAllRulesDescription();
            return {
                output: {
                    rules: rules[integration.identifier],
                    maxLength,
                    settings: !schemas ? 'No additional settings required' : schemas,
                    tools: tools[integration.identifier],
                },
            };
        });
    }
    getMissingContent(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            return this._postsService.getMissingContent(org.id, id);
        });
    }
    updateReleaseId(org, id, releaseId) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            return this._postsService.updateReleaseId(org.id, id, releaseId);
        });
    }
    getAnalytics(org, integration, date) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            return this._integrationService.checkAnalytics(org, integration, date);
        });
    }
    getPostAnalytics(org, postId, date) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            return this._postsService.checkPostAnalytics(org.id, postId, +date);
        });
    }
    triggerIntegrationTool(org, id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            Sentry.metrics.count('public_api-request', 1);
            const getIntegration = yield this._integrationService.getIntegrationById(org.id, id);
            if (!getIntegration) {
                throw new HttpException({ msg: 'Integration not found' }, 404);
            }
            const integrationProvider = socialIntegrationList.find((p) => p.identifier === getIntegration.providerIdentifier);
            if (!integrationProvider) {
                throw new HttpException({ msg: 'Integration provider not found' }, 404);
            }
            const tools = this._integrationManager.getAllTools();
            if (
            // @ts-ignore
            !((_a = tools[integrationProvider.identifier]) === null || _a === void 0 ? void 0 : _a.some((p) => p.methodName === body.methodName)) ||
                // @ts-ignore
                !integrationProvider[body.methodName]) {
                throw new HttpException({ msg: 'Tool not found' }, 404);
            }
            while (true) {
                try {
                    // @ts-ignore
                    const result = yield integrationProvider[body.methodName](getIntegration.token, body.data || {}, getIntegration.internalId, getIntegration);
                    return { output: result };
                }
                catch (err) {
                    if (err instanceof RefreshToken) {
                        const data = yield this._refreshIntegrationService.refresh(getIntegration);
                        if (!data) {
                            yield this._integrationService.disconnectChannel(org.id, getIntegration);
                            throw new HttpException({ msg: 'Channel disconnected due to expired token' }, 401);
                        }
                        const { accessToken } = data;
                        if (accessToken) {
                            getIntegration.token = accessToken;
                            if (integrationProvider.refreshWait) {
                                yield timer(10000);
                            }
                            continue;
                        }
                    }
                    throw new HttpException({ msg: 'Unexpected error' }, 500);
                }
            }
        });
    }
    // ===== Ghost-specific post management endpoints =====
    updatePostDate(org, id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            const action = body.action || 'schedule';
            // Validate date format
            const newDate = new Date(body.date);
            if (isNaN(newDate.getTime())) {
                throw new HttpException({ msg: 'Invalid date format. Use ISO 8601.' }, 400);
            }
            // Update the publish date - PostsService.changeDate handles:
            // - schedule: sets state to QUEUE (or DRAFT if it was draft), resets releaseId/releaseURL
            // - update: just changes the date
            const result = yield this._postsService.changeDate(org.id, id, body.date, action);
            return { success: true, postId: id, publishDate: result.publishDate };
        });
    }
    getPostStatus(org, integrationId, providerPostId) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            const getIntegration = yield this._integrationService.getIntegrationById(org.id, integrationId);
            if (!getIntegration) {
                throw new HttpException({ msg: 'Integration not found' }, 404);
            }
            const provider = this._integrationManager.getSocialIntegration(getIntegration.providerIdentifier);
            if (!provider) {
                throw new HttpException({ msg: 'Integration provider not found' }, 404);
            }
            // Check if provider supports getStatus
            // @ts-ignore
            if (typeof provider.getStatus !== 'function') {
                throw new HttpException({ msg: 'This integration does not support status queries' }, 400);
            }
            try {
                // @ts-ignore
                const status = yield provider.getStatus(getIntegration.token, providerPostId, getIntegration.internalId, getIntegration);
                return { status };
            }
            catch (err) {
                if (err instanceof RefreshToken) {
                    const data = yield this._refreshIntegrationService.refresh(getIntegration);
                    if (!data) {
                        throw new HttpException({ msg: 'Failed to refresh token' }, 401);
                    }
                    // Retry with refreshed token
                    // @ts-ignore
                    const status = yield provider.getStatus(data.accessToken, providerPostId, getIntegration.internalId, getIntegration);
                    return { status };
                }
                throw new HttpException({ msg: err.message || 'Failed to get post status' }, 500);
            }
        });
    }
    changePostStatus(org, integrationId, providerPostId, body) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            const getIntegration = yield this._integrationService.getIntegrationById(org.id, integrationId);
            if (!getIntegration) {
                throw new HttpException({ msg: 'Integration not found' }, 404);
            }
            const provider = this._integrationManager.getSocialIntegration(getIntegration.providerIdentifier);
            if (!provider) {
                throw new HttpException({ msg: 'Integration provider not found' }, 404);
            }
            // Check if provider supports changeStatus
            // @ts-ignore
            if (typeof provider.changeStatus !== 'function') {
                throw new HttpException({ msg: 'This integration does not support status changes' }, 400);
            }
            const validStatuses = ['draft', 'published', 'scheduled'];
            if (!validStatuses.includes(body.status)) {
                throw new HttpException({ msg: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, 400);
            }
            try {
                // @ts-ignore
                const result = yield provider.changeStatus(getIntegration.token, providerPostId, body.status, body.publishedAt, getIntegration.internalId, getIntegration);
                return { success: true, result };
            }
            catch (err) {
                if (err instanceof RefreshToken) {
                    const data = yield this._refreshIntegrationService.refresh(getIntegration);
                    if (!data) {
                        throw new HttpException({ msg: 'Failed to refresh token' }, 401);
                    }
                    // @ts-ignore
                    const result = yield provider.changeStatus(data.accessToken, providerPostId, body.status, body.publishedAt, getIntegration.internalId, getIntegration);
                    return { success: true, result };
                }
                throw new HttpException({ msg: err.message || 'Failed to change post status' }, 500);
            }
        });
    }
    deleteProviderPost(org, integrationId, providerPostId) {
        return __awaiter(this, void 0, void 0, function* () {
            Sentry.metrics.count('public_api-request', 1);
            const getIntegration = yield this._integrationService.getIntegrationById(org.id, integrationId);
            if (!getIntegration) {
                throw new HttpException({ msg: 'Integration not found' }, 404);
            }
            const provider = this._integrationManager.getSocialIntegration(getIntegration.providerIdentifier);
            if (!provider) {
                throw new HttpException({ msg: 'Integration provider not found' }, 404);
            }
            // Check if provider supports delete
            // @ts-ignore
            if (typeof provider.delete !== 'function') {
                throw new HttpException({ msg: 'This integration does not support post deletion' }, 400);
            }
            try {
                // @ts-ignore
                yield provider.delete(getIntegration.token, providerPostId, getIntegration.internalId, getIntegration);
                return { success: true };
            }
            catch (err) {
                if (err instanceof RefreshToken) {
                    const data = yield this._refreshIntegrationService.refresh(getIntegration);
                    if (!data) {
                        throw new HttpException({ msg: 'Failed to refresh token' }, 401);
                    }
                    // @ts-ignore
                    yield provider.delete(data.accessToken, providerPostId, getIntegration.internalId, getIntegration);
                    return { success: true };
                }
                throw new HttpException({ msg: err.message || 'Failed to delete post' }, 500);
            }
        });
    }
};
__decorate([
    Post('/upload'),
    UseInterceptors(FileInterceptor('file')),
    __param(0, GetOrgFromRequest()),
    __param(1, UploadedFile('file')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "uploadSimple", null);
__decorate([
    Post('/upload-from-url'),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UploadDto]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "uploadsFromUrl", null);
__decorate([
    Get('/find-slot/:id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "findSlotIntegration", null);
__decorate([
    Get('/posts'),
    __param(0, GetOrgFromRequest()),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, GetPostsDto]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "getPosts", null);
__decorate([
    Post('/posts'),
    CheckPolicies([AuthorizationActions.Create, Sections.POSTS_PER_MONTH]),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "createPost", null);
__decorate([
    Delete('/posts/:id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "deletePost", null);
__decorate([
    Delete('/posts/group/:group'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('group')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PublicIntegrationsController.prototype, "deletePostByGroup", null);
__decorate([
    Get('/is-connected'),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "getActiveIntegrations", null);
__decorate([
    Get('/integrations'),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "listIntegration", null);
__decorate([
    Get('/social/:integration'),
    CheckPolicies([AuthorizationActions.Create, Sections.CHANNEL]),
    __param(0, Param('integration')),
    __param(1, Query('refresh')),
    __param(2, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "getIntegrationUrl", null);
__decorate([
    Get('/notifications'),
    __param(0, GetOrgFromRequest()),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, GetNotificationsDto]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "getNotifications", null);
__decorate([
    Post('/generate-video'),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, VideoDto]),
    __metadata("design:returntype", void 0)
], PublicIntegrationsController.prototype, "generateVideo", null);
__decorate([
    Post('/video/function'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VideoFunctionDto]),
    __metadata("design:returntype", void 0)
], PublicIntegrationsController.prototype, "videoFunction", null);
__decorate([
    Delete('/integrations/:id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "deleteChannel", null);
__decorate([
    Get('/integration-settings/:id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "getIntegrationSettings", null);
__decorate([
    Get('/posts/:id/missing'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "getMissingContent", null);
__decorate([
    Put('/posts/:id/release-id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __param(2, Body('releaseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "updateReleaseId", null);
__decorate([
    Get('/analytics/:integration'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('integration')),
    __param(2, Query('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "getAnalytics", null);
__decorate([
    Get('/analytics/post/:postId'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('postId')),
    __param(2, Query('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "getPostAnalytics", null);
__decorate([
    Post('/integration-trigger/:id'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "triggerIntegrationTool", null);
__decorate([
    Put('/posts/:id/date'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "updatePostDate", null);
__decorate([
    Get('/integration/:id/post/:postId/status'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __param(2, Param('postId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "getPostStatus", null);
__decorate([
    Put('/integration/:id/post/:postId/status'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __param(2, Param('postId')),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "changePostStatus", null);
__decorate([
    Delete('/integration/:id/post/:postId'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __param(2, Param('postId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], PublicIntegrationsController.prototype, "deleteProviderPost", null);
PublicIntegrationsController = __decorate([
    ApiTags('Public API'),
    Controller('/public/v1'),
    __metadata("design:paramtypes", [IntegrationService,
        PostsService,
        MediaService,
        NotificationService,
        IntegrationManager,
        RefreshIntegrationService])
], PublicIntegrationsController);
export { PublicIntegrationsController };
//# sourceMappingURL=public.integrations.controller.js.map