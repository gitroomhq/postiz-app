import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from "../../../../../libraries/helpers/src/auth/auth.service";
import { ioRedis } from "../../../../../libraries/nestjs-libraries/src/redis/redis.service";
import { IntegrationManager } from "../../../../../libraries/nestjs-libraries/src/integrations/integration.manager";
import { OrganizationService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/organizations/organization.service";
import { IntegrationService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/integrations/integration.service";
import { PostsService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/posts/posts.service";
let EnterpriseController = class EnterpriseController {
    constructor(_integrationManager, _organizationService, _integrationService, _postsService) {
        this._integrationManager = _integrationManager;
        this._organizationService = _organizationService;
        this._integrationService = _integrationService;
        this._postsService = _postsService;
    }
    createUser(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id, name, saasName, email } = AuthService.verifyJWT(params);
                try {
                    return yield this._organizationService.createMaxUser(id, name, saasName, email);
                }
                catch (err) {
                    return { create: false };
                }
            }
            catch (err) {
                return { success: false };
            }
        });
    }
    redirectParams(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const load = AuthService.verifyJWT(params);
                if (!load || !load.redirectUrl || !load.apiKey || !load.provider) {
                    return;
                }
                const org = yield this._organizationService.getOrgByApiKey(load.apiKey);
                if (!org) {
                    throw new Error('Organization not found');
                }
                if (!this._integrationManager
                    .getAllowedSocialsIntegrations()
                    .includes(load.provider)) {
                    throw new Error('Integration not allowed');
                }
                const integrationProvider = this._integrationManager.getSocialIntegration(load.provider);
                const { codeVerifier, state, url } = yield integrationProvider.generateAuthUrl();
                if (load.refreshId) {
                    yield ioRedis.set(`refresh:${state}`, load.refreshId, 'EX', 3600);
                }
                yield ioRedis.set(`webhookUrl:${state}`, load.webhookUrl, 'EX', 3600);
                yield ioRedis.set(`redirect:${state}`, load.redirectUrl, 'EX', 3600);
                yield ioRedis.set(`organization:${state}`, org.id, 'EX', 3600);
                yield ioRedis.set(`login:${state}`, codeVerifier, 'EX', 3600);
                return url;
            }
            catch (err) { }
        });
    }
    deleteChannel(params) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const load = AuthService.verifyJWT(params);
                if (!load || !load.apiKey || !load.id) {
                    return { success: false };
                }
                const org = yield this._organizationService.getOrgByApiKey(load.apiKey);
                if (!org) {
                    return { success: false };
                }
                const isTherePosts = yield this._integrationService.getPostsForChannel(org.id, load.id);
                if (isTherePosts.length) {
                    for (const post of isTherePosts) {
                        this._postsService.deletePost(org.id, post.group).catch(() => { });
                    }
                }
                yield this._integrationService.deleteChannel(org.id, load.id);
                return { success: true };
            }
            catch (err) {
                return { success: false };
            }
        });
    }
};
__decorate([
    Post('/create-user'),
    __param(0, Body('params')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EnterpriseController.prototype, "createUser", null);
__decorate([
    Post('/url'),
    __param(0, Body('params')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EnterpriseController.prototype, "redirectParams", null);
__decorate([
    Post('/delete-channel'),
    __param(0, Body('params')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EnterpriseController.prototype, "deleteChannel", null);
EnterpriseController = __decorate([
    ApiTags('Enterprise'),
    Controller('/enterprise'),
    __metadata("design:paramtypes", [IntegrationManager,
        OrganizationService,
        IntegrationService,
        PostsService])
], EnterpriseController);
export { EnterpriseController };
//# sourceMappingURL=enterprise.controller.js.map