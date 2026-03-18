import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { Body, Controller, Get, HttpException, Param, Post, UseFilters, } from '@nestjs/common';
import { ioRedis } from "../../../../../libraries/nestjs-libraries/src/redis/redis.service";
import { ConnectIntegrationDto } from "../../../../../libraries/nestjs-libraries/src/dtos/integrations/connect.integration.dto";
import { IntegrationManager } from "../../../../../libraries/nestjs-libraries/src/integrations/integration.manager";
import { IntegrationService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/integrations/integration.service";
import { CheckPolicies } from "../../services/auth/permissions/permissions.ability";
import { ApiTags } from '@nestjs/swagger';
import { NotEnoughScopesFilter } from "../../../../../libraries/nestjs-libraries/src/integrations/integration.missing.scopes";
import { AuthService } from "../../../../../libraries/helpers/src/auth/auth.service";
import { NotEnoughScopes } from "../../../../../libraries/nestjs-libraries/src/integrations/social.abstract";
import { AuthorizationActions, Sections, } from "../../services/auth/permissions/permission.exception.class";
import { RefreshIntegrationService } from "../../../../../libraries/nestjs-libraries/src/integrations/refresh.integration.service";
import { OrganizationService } from "../../../../../libraries/nestjs-libraries/src/database/prisma/organizations/organization.service";
let NoAuthIntegrationsController = class NoAuthIntegrationsController {
    constructor(_integrationManager, _integrationService, _refreshIntegrationService, _organizationService) {
        this._integrationManager = _integrationManager;
        this._integrationService = _integrationService;
        this._refreshIntegrationService = _refreshIntegrationService;
        this._organizationService = _organizationService;
    }
    getIntegrations() {
        return this._integrationManager.getAllIntegrations();
    }
    connectSocialMedia(integration, body) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!this._integrationManager
                .getAllowedSocialsIntegrations()
                .includes(integration)) {
                throw new Error('Integration not allowed');
            }
            const integrationProvider = this._integrationManager.getSocialIntegration(integration);
            const getCodeVerifier = integrationProvider.customFields
                ? 'none'
                : yield ioRedis.get(`login:${body.state}`);
            if (!getCodeVerifier) {
                throw new Error('Invalid state');
            }
            const organization = yield ioRedis.get(`organization:${body.state}`);
            if (!organization) {
                throw new Error('Organization not found');
            }
            const org = yield this._organizationService.getOrgById(organization);
            if (!integrationProvider.customFields) {
                yield ioRedis.del(`login:${body.state}`);
            }
            const details = integrationProvider.externalUrl
                ? yield ioRedis.get(`external:${body.state}`)
                : undefined;
            if (details) {
                yield ioRedis.del(`external:${body.state}`);
            }
            const refresh = yield ioRedis.get(`refresh:${body.state}`);
            if (refresh) {
                yield ioRedis.del(`refresh:${body.state}`);
            }
            const onboarding = yield ioRedis.get(`onboarding:${body.state}`);
            if (onboarding) {
                yield ioRedis.del(`onboarding:${body.state}`);
            }
            const { error, accessToken, expiresIn, refreshToken, id, name, picture, username, additionalSettings,
            // eslint-disable-next-line no-async-promise-executor
             } = yield new Promise((res) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const auth = yield integrationProvider.authenticate({
                        code: body.code,
                        codeVerifier: getCodeVerifier,
                        refresh: body.refresh,
                    }, details ? JSON.parse(details) : undefined);
                    if (typeof auth === 'string') {
                        return res({
                            error: auth,
                            accessToken: '',
                            id: '',
                            name: '',
                            picture: '',
                            username: '',
                            additionalSettings: [],
                        });
                    }
                    if (refresh && integrationProvider.reConnect) {
                        console.log('reconnect');
                        try {
                            const newAuth = yield integrationProvider.reConnect(auth.id, refresh, auth.accessToken);
                            return res(Object.assign(Object.assign({}, newAuth), { refreshToken: body.refresh }));
                        }
                        catch (err) {
                            return res({
                                error: err.message,
                                accessToken: '',
                                id: '',
                                name: '',
                                picture: '',
                                username: '',
                                additionalSettings: [],
                            });
                        }
                    }
                    return res(auth);
                }
                catch (err) {
                    if (err instanceof NotEnoughScopes) {
                        return res({
                            error: err.message,
                            accessToken: '',
                            id: '',
                            name: '',
                            picture: '',
                            username: '',
                            additionalSettings: [],
                        });
                    }
                    return res({
                        error: 'Authentication failed',
                        accessToken: '',
                        id: '',
                        name: '',
                        picture: '',
                        username: '',
                        additionalSettings: [],
                    });
                }
            }));
            if (error) {
                throw new NotEnoughScopes(error);
            }
            if (!id) {
                throw new NotEnoughScopes('Invalid API key');
            }
            if (refresh && String(id) !== String(refresh)) {
                throw new NotEnoughScopes('Please refresh the channel that needs to be refreshed');
            }
            let validName = name;
            if (!validName) {
                if (username) {
                    validName = (_a = username.split('.')[0]) !== null && _a !== void 0 ? _a : username;
                }
                else {
                    validName = `Channel_${String(id).slice(0, 8)}`;
                }
            }
            if (process.env.STRIPE_PUBLISHABLE_KEY &&
                org.isTrailing &&
                (yield this._integrationService.checkPreviousConnections(org.id, String(id)))) {
                throw new HttpException('', 412);
            }
            const createUpdate = yield this._integrationService.createOrUpdateIntegration(additionalSettings, !!integrationProvider.oneTimeToken, org.id, validName.trim(), picture, 'social', String(id), integration, accessToken, refreshToken, expiresIn, username, refresh ? false : integrationProvider.isBetweenSteps, body.refresh, +body.timezone, details
                ? AuthService.fixedEncryption(details)
                : integrationProvider.customFields
                    ? AuthService.fixedEncryption(Buffer.from(body.code, 'base64').toString())
                    : integrationProvider.isChromeExtension
                        ? AuthService.signJWT(JSON.parse(Buffer.from(body.code, 'base64').toString()))
                        : undefined);
            this._refreshIntegrationService
                .startRefreshWorkflow(org.id, createUpdate.id, integrationProvider)
                .catch((err) => {
                console.log(err);
            });
            // Fetch pages if this is a two-step provider and not a refresh
            let pages = [];
            if (integrationProvider.isBetweenSteps && !refresh) {
                try {
                    // Check which method the provider uses (pages or companies)
                    const fetchMethod = 'pages' in integrationProvider
                        ? 'pages'
                        : 'companies' in integrationProvider
                            ? 'companies'
                            : null;
                    if (fetchMethod) {
                        // @ts-ignore - dynamic method call
                        pages = yield integrationProvider[fetchMethod](accessToken);
                    }
                }
                catch (err) {
                    console.log('Failed to fetch pages:', err);
                }
            }
            const webhookUrl = yield ioRedis.get(`webhookUrl:${body.state}`);
            if (webhookUrl) {
                try {
                    yield fetch(webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            params: AuthService.signJWT({
                                apiKey: org.apiKey,
                            }),
                        }),
                    });
                }
                catch (err) { }
                yield ioRedis.del(`webhookUrl:${body.state}`);
            }
            const returnURL = yield ioRedis.get(`redirect:${body.state}`);
            if (returnURL) {
                yield ioRedis.del(`redirect:${body.state}`);
            }
            const extensionToken = integrationProvider.isChromeExtension
                ? AuthService.signJWT({
                    integrationId: createUpdate.id,
                    organizationId: org.id,
                    internalId: String(id),
                    provider: integration,
                })
                : undefined;
            return Object.assign(Object.assign(Object.assign(Object.assign({}, createUpdate), { onboarding: onboarding === 'true', pages }), (returnURL ? { returnURL } : {})), (extensionToken ? { extensionToken } : {}));
        });
    }
    saveProviderPage(id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!body.state) {
                throw new Error('Invalid state');
            }
            const organization = yield ioRedis.get(`organization:${body.state}`);
            if (!organization) {
                throw new Error('Organization not found');
            }
            const org = yield this._organizationService.getOrgById(organization);
            return this._integrationService.saveProviderPage(org.id, id, body);
        });
    }
    extensionRefreshCookies(body) {
        return __awaiter(this, void 0, void 0, function* () {
            let payload;
            try {
                payload = AuthService.verifyJWT(body.jwt);
            }
            catch (_a) {
                throw new HttpException('Invalid token', 401);
            }
            const { integrationId, organizationId, internalId, provider } = payload;
            if (!integrationId || !organizationId || !internalId || !provider) {
                throw new HttpException('Invalid token payload', 400);
            }
            const integration = yield this._integrationService.getIntegrationById(organizationId, integrationId);
            if (!integration || integration.internalId !== internalId) {
                throw new HttpException('Integration not found', 404);
            }
            const integrationProvider = this._integrationManager.getSocialIntegration(provider);
            if (!(integrationProvider === null || integrationProvider === void 0 ? void 0 : integrationProvider.isChromeExtension)) {
                throw new HttpException('Not a Chrome extension integration', 400);
            }
            const authResult = yield integrationProvider.authenticate({
                code: body.cookies,
                codeVerifier: '',
            });
            if (typeof authResult === 'string') {
                throw new HttpException(authResult, 400);
            }
            if (String(authResult.id) !== String(integration.internalId)) {
                yield this._integrationService.refreshNeeded(organizationId, integrationId);
                return { success: false, reason: 'account_mismatch' };
            }
            yield this._integrationService.createOrUpdateIntegration(undefined, false, organizationId, integration.name, undefined, 'social', integration.internalId, integration.providerIdentifier, authResult.accessToken, '', authResult.expiresIn, undefined, false, undefined, undefined, AuthService.signJWT(JSON.parse(Buffer.from(body.cookies, 'base64').toString())));
            return { success: true };
        });
    }
};
__decorate([
    Get('/'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NoAuthIntegrationsController.prototype, "getIntegrations", null);
__decorate([
    Post('/social-connect/:integration'),
    CheckPolicies([AuthorizationActions.Create, Sections.CHANNEL]),
    UseFilters(new NotEnoughScopesFilter()),
    __param(0, Param('integration')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ConnectIntegrationDto]),
    __metadata("design:returntype", Promise)
], NoAuthIntegrationsController.prototype, "connectSocialMedia", null);
__decorate([
    Post('/public/provider/:id/connect'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NoAuthIntegrationsController.prototype, "saveProviderPage", null);
__decorate([
    Post('/extension-refresh'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NoAuthIntegrationsController.prototype, "extensionRefreshCookies", null);
NoAuthIntegrationsController = __decorate([
    ApiTags('Integrations'),
    Controller('/integrations'),
    __metadata("design:paramtypes", [IntegrationManager,
        IntegrationService,
        RefreshIntegrationService,
        OrganizationService])
], NoAuthIntegrationsController);
export { NoAuthIntegrationsController };
//# sourceMappingURL=no.auth.integrations.controller.js.map