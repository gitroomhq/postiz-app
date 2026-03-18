import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Body, Controller, Delete, Get, Param, Post, Put, Query, } from '@nestjs/common';
import { ioRedis } from "../../../../../libraries/nestjs-libraries/src/redis/redis.service";
import { IntegrationManager } from "../../../../../libraries/nestjs-libraries/src/integrations/integration.manager";
import { IntegrationService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/integrations/integration.service";
import { GetOrgFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/org.from.request";
import { IntegrationFunctionDto } from "../../../../../libraries/nestjs-libraries/src/dtos/integrations/integration.function.dto";
import { CheckPolicies } from "../../services/auth/permissions/permissions.ability";
import { pricing } from "../../../../../libraries/nestjs-libraries/src/database/prisma/subscriptions/pricing";
import { ApiTags } from '@nestjs/swagger';
import { GetUserFromRequest } from "../../../../../libraries/nestjs-libraries/src/user/user.from.request";
import { PostsService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/posts/posts.service";
import { IntegrationTimeDto } from "../../../../../libraries/nestjs-libraries/src/dtos/integrations/integration.time.dto";
import { PlugDto } from "../../../../../libraries/nestjs-libraries/src/dtos/plugs/plug.dto";
import { RefreshToken } from "../../../../../libraries/nestjs-libraries/src/integrations/social.abstract";
import { timer } from "../../../../../libraries/helpers/src/utils/timer";
import { TelegramProvider } from "../../../../../libraries/nestjs-libraries/src/integrations/social/telegram.provider";
import { MoltbookProvider } from "../../../../../libraries/nestjs-libraries/src/integrations/social/moltbook.provider";
import { AuthorizationActions, Sections, } from "../../services/auth/permissions/permission.exception.class";
import { uniqBy } from 'lodash';
import { RefreshIntegrationService } from "../../../../../libraries/nestjs-libraries/src/integrations/refresh.integration.service";
let IntegrationsController = class IntegrationsController {
    constructor(_integrationManager, _integrationService, _postService, _refreshIntegrationService) {
        this._integrationManager = _integrationManager;
        this._integrationService = _integrationService;
        this._postService = _postService;
        this._refreshIntegrationService = _refreshIntegrationService;
    }
    saveProviderPage(org, id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integrationService.saveProviderPage(org.id, id, body);
        });
    }
    getInternalPlugs(identifier) {
        return this._integrationManager.getInternalPlugs(identifier);
    }
    getCustomers(org) {
        return this._integrationService.customers(org.id);
    }
    updateIntegrationGroup(org, id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integrationService.updateIntegrationGroup(org.id, id, body.group);
        });
    }
    updateOnCustomerName(org, id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integrationService.updateOnCustomerName(org.id, id, body.name);
        });
    }
    getIntegrationList(org) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                integrations: yield Promise.all((yield this._integrationService.getIntegrationsList(org.id)).map((p) => __awaiter(this, void 0, void 0, function* () {
                    const findIntegration = this._integrationManager.getSocialIntegration(p.providerIdentifier);
                    return Object.assign(Object.assign({ name: p.name, id: p.id, internalId: p.internalId, disabled: p.disabled, editor: findIntegration.editor, picture: p.picture || '/no-picture.jpg', identifier: p.providerIdentifier, inBetweenSteps: p.inBetweenSteps, refreshNeeded: p.refreshNeeded, isCustomFields: !!findIntegration.customFields }, (findIntegration.customFields
                        ? { customFields: yield findIntegration.customFields() }
                        : {})), { display: p.profile, type: p.type, time: JSON.parse(p.postingTimes), changeProfilePicture: !!(findIntegration === null || findIntegration === void 0 ? void 0 : findIntegration.changeProfilePicture), changeNickName: !!(findIntegration === null || findIntegration === void 0 ? void 0 : findIntegration.changeNickname), customer: p.customer, additionalSettings: p.additionalSettings || '[]' });
                }))),
            };
        });
    }
    updateProviderSettings(org, id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof body !== 'string') {
                throw new Error('Invalid body');
            }
            yield this._integrationService.updateProviderSettings(org.id, id, body);
        });
    }
    setNickname(org, id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            const integration = yield this._integrationService.getIntegrationById(org.id, id);
            if (!integration) {
                throw new Error('Invalid integration');
            }
            const manager = this._integrationManager.getSocialIntegration(integration.providerIdentifier);
            if (!manager.changeProfilePicture && !manager.changeNickname) {
                throw new Error('Invalid integration');
            }
            const { url } = manager.changeProfilePicture
                ? yield manager.changeProfilePicture(integration.internalId, integration.token, body.picture)
                : { url: '' };
            const { name } = manager.changeNickname
                ? yield manager.changeNickname(integration.internalId, integration.token, body.name)
                : { name: '' };
            return this._integrationService.updateNameAndUrl(id, name, url);
        });
    }
    getSingleIntegration(id, order, user, org) {
        return this._integrationService.getIntegrationForOrder(id, order, user.id, org.id);
    }
    getIntegrationUrl(integration, refresh, externalUrl, onboarding, org) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._integrationManager
                .getAllowedSocialsIntegrations()
                .includes(integration)) {
                throw new Error('Integration not allowed');
            }
            const integrationProvider = this._integrationManager.getSocialIntegration(integration);
            if (integrationProvider.externalUrl && !externalUrl) {
                throw new Error('Missing external url');
            }
            try {
                const getExternalUrl = integrationProvider.externalUrl
                    ? Object.assign(Object.assign({}, (yield integrationProvider.externalUrl(externalUrl))), { instanceUrl: externalUrl }) : undefined;
                const { codeVerifier, state, url } = yield integrationProvider.generateAuthUrl(getExternalUrl);
                if (refresh) {
                    yield ioRedis.set(`refresh:${state}`, refresh, 'EX', 3600);
                }
                if (onboarding === 'true') {
                    yield ioRedis.set(`onboarding:${state}`, 'true', 'EX', 3600);
                }
                yield ioRedis.set(`organization:${state}`, org.id, 'EX', 3600);
                yield ioRedis.set(`login:${state}`, codeVerifier, 'EX', 3600);
                yield ioRedis.set(`external:${state}`, JSON.stringify(getExternalUrl), 'EX', 3600);
                return { url };
            }
            catch (err) {
                return { err: true };
            }
        });
    }
    setTime(org, id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integrationService.setTimes(org.id, id, body);
        });
    }
    mentions(org, body) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const getIntegration = yield this._integrationService.getIntegrationById(org.id, body.id);
            if (!getIntegration) {
                throw new Error('Invalid integration');
            }
            let newList = [];
            try {
                newList = (yield this.functionIntegration(org, body)) || [];
            }
            catch (err) {
                console.log(err);
            }
            if (!Array.isArray(newList) && (newList === null || newList === void 0 ? void 0 : newList.none)) {
                return newList;
            }
            const list = yield this._integrationService.getMentions(getIntegration.providerIdentifier, (_a = body === null || body === void 0 ? void 0 : body.data) === null || _a === void 0 ? void 0 : _a.query);
            if (Array.isArray(newList) && newList.length) {
                yield this._integrationService.insertMentions(getIntegration.providerIdentifier, newList
                    .map((p) => ({
                    name: p.label || '',
                    username: p.id || '',
                    image: p.image || '',
                    doNotCache: p.doNotCache || false,
                }))
                    .filter((f) => f.name && !f.doNotCache));
            }
            return uniqBy([
                ...list.map((p) => ({
                    id: p.username,
                    image: p.image,
                    label: p.name,
                })),
                ...newList,
            ], (p) => p.id).filter((f) => f.label && f.id);
        });
    }
    functionIntegration(org, body) {
        return __awaiter(this, void 0, void 0, function* () {
            const getIntegration = yield this._integrationService.getIntegrationById(org.id, body.id);
            if (!getIntegration) {
                throw new Error('Invalid integration');
            }
            const integrationProvider = this._integrationManager.getSocialIntegration(getIntegration.providerIdentifier);
            if (!integrationProvider) {
                throw new Error('Invalid provider');
            }
            // @ts-ignore
            if (integrationProvider[body.name]) {
                try {
                    // @ts-ignore
                    const load = yield integrationProvider[body.name](getIntegration.token, body.data, getIntegration.internalId, getIntegration);
                    return load;
                }
                catch (err) {
                    if (err instanceof RefreshToken) {
                        const data = yield this._refreshIntegrationService.refresh(getIntegration);
                        if (!data) {
                            return;
                        }
                        const { accessToken } = data;
                        if (accessToken) {
                            if (integrationProvider.refreshWait) {
                                yield timer(10000);
                            }
                            return this.functionIntegration(org, body);
                        }
                        return false;
                    }
                    return false;
                }
            }
            throw new Error('Function not found');
        });
    }
    disableChannel(org, id) {
        return this._integrationService.disableChannel(org.id, id);
    }
    enableChannel(org, id) {
        var _a;
        return this._integrationService.enableChannel(org.id, 
        // @ts-ignore
        ((_a = org === null || org === void 0 ? void 0 : org.subscription) === null || _a === void 0 ? void 0 : _a.totalChannels) || pricing.FREE.channel, id);
    }
    deleteChannel(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const isTherePosts = yield this._integrationService.getPostsForChannel(org.id, id);
            if (isTherePosts.length) {
                for (const post of isTherePosts) {
                    this._postService.deletePost(org.id, post.group).catch((err) => { });
                }
            }
            return this._integrationService.deleteChannel(org.id, id);
        });
    }
    getPlugList() {
        return __awaiter(this, void 0, void 0, function* () {
            return { plugs: this._integrationManager.getAllPlugs() };
        });
    }
    getPlugsByIntegrationId(id, org) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integrationService.getPlugsByIntegrationId(org.id, id);
        });
    }
    postPlugsByIntegrationId(id, org, body) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integrationService.createOrUpdatePlug(org.id, id, body);
        });
    }
    changePlugActivation(id, org, status) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integrationService.changePlugActivation(org.id, id, status);
        });
    }
    getUpdates(query) {
        return __awaiter(this, void 0, void 0, function* () {
            return new TelegramProvider().getBotId(query);
        });
    }
    moltbookRegister(body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const provider = new MoltbookProvider();
                const result = yield provider.registerAgent(body.name, body.description);
                return {
                    apiKey: result.api_key,
                    claimUrl: result.claim_url,
                    verificationCode: result.verification_code,
                };
            }
            catch (err) {
                return { error: err.message || 'Registration failed' };
            }
        });
    }
    moltbookStatus(apiKey) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const provider = new MoltbookProvider();
                const result = yield provider.checkAgentStatus(apiKey);
                return { claimed: (result === null || result === void 0 ? void 0 : result.status) === 'claimed' };
            }
            catch (err) {
                return { claimed: false };
            }
        });
    }
};
__decorate([
    Post('/provider/:id/connect'),
    CheckPolicies([AuthorizationActions.Create, Sections.CHANNEL]),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "saveProviderPage", null);
__decorate([
    Get('/:identifier/internal-plugs'),
    __param(0, Param('identifier')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "getInternalPlugs", null);
__decorate([
    Get('/customers'),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "getCustomers", null);
__decorate([
    Put('/:id/group'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "updateIntegrationGroup", null);
__decorate([
    Put('/:id/customer-name'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "updateOnCustomerName", null);
__decorate([
    Get('/list'),
    __param(0, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "getIntegrationList", null);
__decorate([
    Post('/:id/settings'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __param(2, Body('additionalSettings')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "updateProviderSettings", null);
__decorate([
    Post('/:id/nickname'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "setNickname", null);
__decorate([
    Get('/:id'),
    __param(0, Param('id')),
    __param(1, Query('order')),
    __param(2, GetUserFromRequest()),
    __param(3, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "getSingleIntegration", null);
__decorate([
    Get('/social/:integration'),
    CheckPolicies([AuthorizationActions.Create, Sections.CHANNEL]),
    __param(0, Param('integration')),
    __param(1, Query('refresh')),
    __param(2, Query('externalUrl')),
    __param(3, Query('onboarding')),
    __param(4, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "getIntegrationUrl", null);
__decorate([
    Post('/:id/time'),
    __param(0, GetOrgFromRequest()),
    __param(1, Param('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, IntegrationTimeDto]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "setTime", null);
__decorate([
    Post('/mentions'),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, IntegrationFunctionDto]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "mentions", null);
__decorate([
    Post('/function'),
    __param(0, GetOrgFromRequest()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, IntegrationFunctionDto]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "functionIntegration", null);
__decorate([
    Post('/disable'),
    __param(0, GetOrgFromRequest()),
    __param(1, Body('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "disableChannel", null);
__decorate([
    Post('/enable'),
    __param(0, GetOrgFromRequest()),
    __param(1, Body('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], IntegrationsController.prototype, "enableChannel", null);
__decorate([
    Delete('/'),
    __param(0, GetOrgFromRequest()),
    __param(1, Body('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "deleteChannel", null);
__decorate([
    Get('/plug/list'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "getPlugList", null);
__decorate([
    Get('/:id/plugs'),
    __param(0, Param('id')),
    __param(1, GetOrgFromRequest()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "getPlugsByIntegrationId", null);
__decorate([
    Post('/:id/plugs'),
    __param(0, Param('id')),
    __param(1, GetOrgFromRequest()),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, PlugDto]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "postPlugsByIntegrationId", null);
__decorate([
    Put('/plugs/:id/activate'),
    __param(0, Param('id')),
    __param(1, GetOrgFromRequest()),
    __param(2, Body('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Boolean]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "changePlugActivation", null);
__decorate([
    Get('/telegram/updates'),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "getUpdates", null);
__decorate([
    Post('/moltbook/register'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "moltbookRegister", null);
__decorate([
    Get('/moltbook/status'),
    __param(0, Query('apiKey')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IntegrationsController.prototype, "moltbookStatus", null);
IntegrationsController = __decorate([
    ApiTags('Integrations'),
    Controller('/integrations'),
    __metadata("design:paramtypes", [IntegrationManager,
        IntegrationService,
        PostsService,
        RefreshIntegrationService])
], IntegrationsController);
export { IntegrationsController };
//# sourceMappingURL=integrations.controller.js.map