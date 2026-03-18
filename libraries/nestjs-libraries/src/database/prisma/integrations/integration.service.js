import { __awaiter, __decorate, __metadata, __param } from "tslib";
import { forwardRef, HttpException, HttpStatus, Inject, Injectable, } from '@nestjs/common';
import { IntegrationRepository } from "./integration.repository";
import { IntegrationManager } from "../../../integrations/integration.manager";
import { NotificationService } from "../notifications/notification.service";
import dayjs from 'dayjs';
import { timer } from "../../../../../helpers/src/utils/timer";
import { ioRedis } from "../../../redis/redis.service";
import { RefreshToken } from "../../../integrations/social.abstract";
import { UploadFactory } from "../../../upload/upload.factory";
import { difference, uniq } from 'lodash';
import utc from 'dayjs/plugin/utc';
import { AutopostRepository } from "../autopost/autopost.repository";
import { RefreshIntegrationService } from "../../../integrations/refresh.integration.service";
import { TemporalService } from 'nestjs-temporal-core';
dayjs.extend(utc);
let IntegrationService = class IntegrationService {
    constructor(_integrationRepository, _autopostsRepository, _integrationManager, _notificationService, _refreshIntegrationService, _temporalService) {
        this._integrationRepository = _integrationRepository;
        this._autopostsRepository = _autopostsRepository;
        this._integrationManager = _integrationManager;
        this._notificationService = _notificationService;
        this._refreshIntegrationService = _refreshIntegrationService;
        this._temporalService = _temporalService;
        this.storage = UploadFactory.createStorage();
    }
    changeActiveCron(orgId) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this._autopostsRepository.getAutoposts(orgId);
            for (const item of data.filter((f) => f.active)) {
                try {
                    yield this._temporalService.terminateWorkflow(`autopost-${item.id}`);
                }
                catch (err) { }
            }
            return true;
        });
    }
    getMentions(platform, q) {
        return this._integrationRepository.getMentions(platform, q);
    }
    insertMentions(platform, mentions) {
        return this._integrationRepository.insertMentions(platform, mentions);
    }
    setTimes(orgId, integrationId, times) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integrationRepository.setTimes(orgId, integrationId, times);
        });
    }
    updateProviderSettings(org, id, additionalSettings) {
        return this._integrationRepository.updateProviderSettings(org, id, additionalSettings);
    }
    checkPreviousConnections(org, id) {
        return this._integrationRepository.checkPreviousConnections(org, id);
    }
    createOrUpdateIntegration(additionalSettings_1, oneTimeToken_1, org_1, name_1, picture_1, type_1, internalId_1, provider_1, token_1) {
        return __awaiter(this, arguments, void 0, function* (additionalSettings, oneTimeToken, org, name, picture, type, internalId, provider, token, refreshToken = '', expiresIn, username, isBetweenSteps = false, refresh, timezone, customInstanceDetails) {
            const uploadedPicture = picture
                ? (picture === null || picture === void 0 ? void 0 : picture.indexOf('imagedelivery.net')) > -1
                    ? picture
                    : yield this.storage.uploadSimple(picture)
                : undefined;
            return this._integrationRepository.createOrUpdateIntegration(additionalSettings, oneTimeToken, org, name, uploadedPicture, type, internalId, provider, token, refreshToken, expiresIn, username, isBetweenSteps, refresh, timezone, customInstanceDetails);
        });
    }
    updateIntegrationGroup(org, id, group) {
        return this._integrationRepository.updateIntegrationGroup(org, id, group);
    }
    updateOnCustomerName(org, id, name) {
        return this._integrationRepository.updateOnCustomerName(org, id, name);
    }
    getIntegrationsList(org) {
        return this._integrationRepository.getIntegrationsList(org);
    }
    getIntegrationForOrder(id, order, user, org) {
        return this._integrationRepository.getIntegrationForOrder(id, order, user, org);
    }
    updateNameAndUrl(id, name, url) {
        return this._integrationRepository.updateNameAndUrl(id, name, url);
    }
    getIntegrationById(org, id) {
        return this._integrationRepository.getIntegrationById(org, id);
    }
    refreshToken(provider, refresh) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { refreshToken, accessToken, expiresIn } = yield provider.refreshToken(refresh);
                if (!refreshToken || !accessToken || !expiresIn) {
                    return false;
                }
                return { refreshToken, accessToken, expiresIn };
            }
            catch (e) {
                return false;
            }
        });
    }
    disconnectChannel(orgId, integration) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._integrationRepository.disconnectChannel(orgId, integration.id);
            yield this.informAboutRefreshError(orgId, integration);
        });
    }
    informAboutRefreshError(orgId_1, integration_1) {
        return __awaiter(this, arguments, void 0, function* (orgId, integration, err = '') {
            yield this._notificationService.inAppNotification(orgId, `Could not refresh your ${integration.providerIdentifier} channel ${err}`, `Could not refresh your ${integration.providerIdentifier} channel ${err}. Please go back to the system and connect it again ${process.env.FRONTEND_URL}/launches`, true, false, 'info');
        });
    }
    refreshNeeded(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integrationRepository.refreshNeeded(org, id);
        });
    }
    setBetweenRefreshSteps(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integrationRepository.setBetweenRefreshSteps(id);
        });
    }
    refreshTokens() {
        return __awaiter(this, void 0, void 0, function* () {
            const integrations = yield this._integrationRepository.needsToBeRefreshed();
            for (const integration of integrations) {
                const provider = this._integrationManager.getSocialIntegration(integration.providerIdentifier);
                const data = yield this.refreshToken(provider, integration.refreshToken);
                if (!data) {
                    yield this.informAboutRefreshError(integration.organizationId, integration);
                    yield this._integrationRepository.refreshNeeded(integration.organizationId, integration.id);
                    return;
                }
                const { refreshToken, accessToken, expiresIn } = data;
                yield this.createOrUpdateIntegration(undefined, !!provider.oneTimeToken, integration.organizationId, integration.name, undefined, 'social', integration.internalId, integration.providerIdentifier, accessToken, refreshToken, expiresIn);
            }
        });
    }
    disableChannel(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integrationRepository.disableChannel(org, id);
        });
    }
    enableChannel(org, totalChannels, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const integrations = (yield this._integrationRepository.getIntegrationsList(org)).filter((f) => !f.disabled);
            if (!!process.env.STRIPE_PUBLISHABLE_KEY &&
                integrations.length >= totalChannels) {
                throw new Error('You have reached the maximum number of channels');
            }
            return this._integrationRepository.enableChannel(org, id);
        });
    }
    getPostsForChannel(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integrationRepository.getPostsForChannel(org, id);
        });
    }
    deleteChannel(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integrationRepository.deleteChannel(org, id);
        });
    }
    disableIntegrations(org, totalChannels) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integrationRepository.disableIntegrations(org, totalChannels);
        });
    }
    checkForDeletedOnceAndUpdate(org, page) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integrationRepository.checkForDeletedOnceAndUpdate(org, page);
        });
    }
    saveProviderPage(org, id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const getIntegration = yield this._integrationRepository.getIntegrationById(org, id);
            if (!getIntegration) {
                throw new HttpException('Integration not found', HttpStatus.NOT_FOUND);
            }
            if (!getIntegration.inBetweenSteps) {
                throw new HttpException('Invalid request', HttpStatus.BAD_REQUEST);
            }
            const provider = this._integrationManager.getSocialIntegration(getIntegration.providerIdentifier);
            if (!provider.fetchPageInformation) {
                throw new HttpException('Provider does not support page selection', HttpStatus.BAD_REQUEST);
            }
            const getIntegrationInformation = yield provider.fetchPageInformation(getIntegration.token, data);
            yield this.checkForDeletedOnceAndUpdate(org, String(getIntegrationInformation.id));
            yield this._integrationRepository.updateIntegration(id, {
                picture: getIntegrationInformation.picture,
                internalId: String(getIntegrationInformation.id),
                organizationId: org,
                name: getIntegrationInformation.name,
                inBetweenSteps: false,
                token: getIntegrationInformation.access_token,
                profile: getIntegrationInformation.username,
            });
            return { success: true };
        });
    }
    checkAnalytics(org_1, integration_1, date_1) {
        return __awaiter(this, arguments, void 0, function* (org, integration, date, forceRefresh = false) {
            const getIntegration = yield this.getIntegrationById(org.id, integration);
            if (!getIntegration) {
                throw new Error('Invalid integration');
            }
            if (getIntegration.type !== 'social') {
                return [];
            }
            const integrationProvider = this._integrationManager.getSocialIntegration(getIntegration.providerIdentifier);
            if (dayjs(getIntegration === null || getIntegration === void 0 ? void 0 : getIntegration.tokenExpiration).isBefore(dayjs()) ||
                forceRefresh) {
                const data = yield this._refreshIntegrationService.refresh(getIntegration);
                if (!data) {
                    return [];
                }
                const { accessToken } = data;
                if (accessToken) {
                    getIntegration.token = accessToken;
                    if (integrationProvider.refreshWait) {
                        yield timer(10000);
                    }
                }
                else {
                    yield this.disconnectChannel(org.id, getIntegration);
                    return [];
                }
            }
            const getIntegrationData = yield ioRedis.get(`integration:${org.id}:${integration}:${date}`);
            if (getIntegrationData) {
                return JSON.parse(getIntegrationData);
            }
            if (integrationProvider.analytics) {
                try {
                    const loadAnalytics = yield integrationProvider.analytics(getIntegration.internalId, getIntegration.token, +date);
                    yield ioRedis.set(`integration:${org.id}:${integration}:${date}`, JSON.stringify(loadAnalytics), 'EX', !process.env.NODE_ENV || process.env.NODE_ENV === 'development'
                        ? 1
                        : 3600);
                    return loadAnalytics;
                }
                catch (e) {
                    if (e instanceof RefreshToken) {
                        return this.checkAnalytics(org, integration, date, true);
                    }
                }
            }
            return [];
        });
    }
    customers(orgId) {
        return this._integrationRepository.customers(orgId);
    }
    getPlugsByIntegrationId(org, integrationId) {
        return this._integrationRepository.getPlugsByIntegrationId(org, integrationId);
    }
    processInternalPlug(data_1) {
        return __awaiter(this, arguments, void 0, function* (data, forceRefresh = false) {
            var _a;
            const originalIntegration = yield this._integrationRepository.getIntegrationById(data.orgId, data.originalIntegration);
            const getIntegration = yield this._integrationRepository.getIntegrationById(data.orgId, data.integration);
            if (!getIntegration || !originalIntegration) {
                return;
            }
            const getAllInternalPlugs = this._integrationManager
                .getInternalPlugs(getIntegration.providerIdentifier)
                .internalPlugs.find((p) => p.identifier === data.plugName);
            if (!getAllInternalPlugs) {
                return;
            }
            const getSocialIntegration = this._integrationManager.getSocialIntegration(getIntegration.providerIdentifier);
            // @ts-ignore
            yield ((_a = getSocialIntegration === null || getSocialIntegration === void 0 ? void 0 : getSocialIntegration[getAllInternalPlugs.methodName]) === null || _a === void 0 ? void 0 : _a.call(getSocialIntegration, getIntegration, originalIntegration, data.post, data.information));
            return;
        });
    }
    processPlugs(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const getPlugById = yield this._integrationRepository.getPlug(data.plugId);
            if (!getPlugById) {
                return true;
            }
            const integration = this._integrationManager.getSocialIntegration(getPlugById.integration.providerIdentifier);
            // @ts-ignore
            const process = yield integration[getPlugById.plugFunction](getPlugById.integration, data.postId, JSON.parse(getPlugById.data).reduce((all, current) => {
                all[current.name] = current.value;
                return all;
            }, {}));
            if (process) {
                return true;
            }
            if (data.totalRuns === data.currentRun) {
                return true;
            }
            return false;
        });
    }
    createOrUpdatePlug(orgId, integrationId, body) {
        return __awaiter(this, void 0, void 0, function* () {
            const { activated } = yield this._integrationRepository.createOrUpdatePlug(orgId, integrationId, body);
            return {
                activated,
            };
        });
    }
    changePlugActivation(orgId, plugId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            const { id, integrationId, plugFunction } = yield this._integrationRepository.changePlugActivation(orgId, plugId, status);
            return { id };
        });
    }
    getPlugs(orgId, integrationId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integrationRepository.getPlugs(orgId, integrationId);
        });
    }
    loadExisingData(methodName, integrationId, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const exisingData = yield this._integrationRepository.loadExisingData(methodName, integrationId, id);
            const loadOnlyIds = exisingData.map((p) => p.value);
            return difference(id, loadOnlyIds);
        });
    }
    findFreeDateTime(orgId, integrationsId) {
        return __awaiter(this, void 0, void 0, function* () {
            const findTimes = yield this._integrationRepository.getPostingTimes(orgId, integrationsId);
            return uniq(findTimes.reduce((all, current) => {
                return [
                    ...all,
                    ...JSON.parse(current.postingTimes).map((p) => p.time),
                ];
            }, []));
        });
    }
};
IntegrationService = __decorate([
    Injectable(),
    __param(4, Inject(forwardRef(() => RefreshIntegrationService))),
    __metadata("design:paramtypes", [IntegrationRepository,
        AutopostRepository,
        IntegrationManager,
        NotificationService,
        RefreshIntegrationService,
        TemporalService])
], IntegrationService);
export { IntegrationService };
//# sourceMappingURL=integration.service.js.map