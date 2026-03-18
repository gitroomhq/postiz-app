import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { pricing } from "./pricing";
import { SubscriptionRepository } from "./subscription.repository";
import { IntegrationService } from "../integrations/integration.service";
import { OrganizationService } from "../organizations/organization.service";
import dayjs from 'dayjs';
import { makeId } from "../../../services/make.is";
let SubscriptionService = class SubscriptionService {
    constructor(_subscriptionRepository, _integrationService, _organizationService) {
        this._subscriptionRepository = _subscriptionRepository;
        this._integrationService = _integrationService;
        this._organizationService = _organizationService;
    }
    getSubscriptionByOrganizationId(organizationId) {
        return this._subscriptionRepository.getSubscriptionByOrganizationId(organizationId);
    }
    useCredit(organization, type = 'ai_images', func) {
        return this._subscriptionRepository.useCredit(organization, type, func);
    }
    getCode(code) {
        return this._subscriptionRepository.getCode(code);
    }
    deleteSubscription(customerId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.modifySubscription(customerId, pricing.FREE.channel || 0, 'FREE');
            return this._subscriptionRepository.deleteSubscriptionByCustomerId(customerId);
        });
    }
    updateCustomerId(organizationId, customerId) {
        return this._subscriptionRepository.updateCustomerId(organizationId, customerId);
    }
    checkSubscription(organizationId, subscriptionId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._subscriptionRepository.checkSubscription(organizationId, subscriptionId);
        });
    }
    modifySubscriptionByOrg(organizationId, totalChannels, billing) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!organizationId) {
                return false;
            }
            const getCurrentSubscription = (yield this._subscriptionRepository.getSubscriptionByOrgId(organizationId));
            const from = pricing[(getCurrentSubscription === null || getCurrentSubscription === void 0 ? void 0 : getCurrentSubscription.subscriptionTier) || 'FREE'];
            const to = pricing[billing];
            const currentTotalChannels = (yield this._integrationService.getIntegrationsList(organizationId)).filter((f) => !f.disabled);
            if (currentTotalChannels.length > totalChannels) {
                yield this._integrationService.disableIntegrations(organizationId, currentTotalChannels.length - totalChannels);
            }
            if (from.team_members && !to.team_members) {
                yield this._organizationService.disableOrEnableNonSuperAdminUsers(organizationId, true);
            }
            if (!from.team_members && to.team_members) {
                yield this._organizationService.disableOrEnableNonSuperAdminUsers(organizationId, false);
            }
            if (billing === 'FREE') {
                yield this._integrationService.changeActiveCron(organizationId);
            }
            return true;
        });
    }
    modifySubscription(customerId, totalChannels, billing) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!customerId) {
                return false;
            }
            const getOrgByCustomerId = yield this._subscriptionRepository.getOrganizationByCustomerId(customerId);
            const getCurrentSubscription = (yield this._subscriptionRepository.getSubscriptionByCustomerId(customerId));
            if (!getOrgByCustomerId ||
                (getCurrentSubscription && (getCurrentSubscription === null || getCurrentSubscription === void 0 ? void 0 : getCurrentSubscription.isLifetime))) {
                return false;
            }
            const from = pricing[(getCurrentSubscription === null || getCurrentSubscription === void 0 ? void 0 : getCurrentSubscription.subscriptionTier) || 'FREE'];
            const to = pricing[billing];
            const currentTotalChannels = (yield this._integrationService.getIntegrationsList(getOrgByCustomerId === null || getOrgByCustomerId === void 0 ? void 0 : getOrgByCustomerId.id)).filter((f) => !f.disabled);
            if (currentTotalChannels.length > totalChannels) {
                yield this._integrationService.disableIntegrations(getOrgByCustomerId === null || getOrgByCustomerId === void 0 ? void 0 : getOrgByCustomerId.id, currentTotalChannels.length - totalChannels);
            }
            if (from.team_members && !to.team_members) {
                yield this._organizationService.disableOrEnableNonSuperAdminUsers(getOrgByCustomerId === null || getOrgByCustomerId === void 0 ? void 0 : getOrgByCustomerId.id, true);
            }
            if (!from.team_members && to.team_members) {
                yield this._organizationService.disableOrEnableNonSuperAdminUsers(getOrgByCustomerId === null || getOrgByCustomerId === void 0 ? void 0 : getOrgByCustomerId.id, false);
            }
            if (billing === 'FREE') {
                yield this._integrationService.changeActiveCron(getOrgByCustomerId === null || getOrgByCustomerId === void 0 ? void 0 : getOrgByCustomerId.id);
            }
            return true;
        });
    }
    createOrUpdateSubscription(isTrailing, identifier, customerId, totalChannels, billing, period, cancelAt, code, org) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!code) {
                try {
                    const load = yield this.modifySubscription(customerId, totalChannels, billing);
                    if (!load) {
                        return {};
                    }
                }
                catch (e) {
                    return {};
                }
            }
            return this._subscriptionRepository.createOrUpdateSubscription(isTrailing, identifier, customerId, totalChannels, billing, period, cancelAt, code, org ? { id: org } : undefined);
        });
    }
    getSubscriptionByIdentifier(identifier) {
        return this._subscriptionRepository.getSubscriptionByIdentifier(identifier);
    }
    getSubscription(organizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._subscriptionRepository.getSubscription(organizationId);
        });
    }
    checkCredits(organization_1) {
        return __awaiter(this, arguments, void 0, function* (organization, checkType = 'ai_images') {
            var _a;
            // @ts-ignore
            const type = ((_a = organization === null || organization === void 0 ? void 0 : organization.subscription) === null || _a === void 0 ? void 0 : _a.subscriptionTier) || 'FREE';
            if (type === 'FREE') {
                return { credits: 0 };
            }
            // @ts-ignore
            let date = dayjs(organization.subscription.createdAt);
            while (date.isBefore(dayjs())) {
                date = date.add(1, 'month');
            }
            const checkFromMonth = date.subtract(1, 'month');
            const imageGenerationCount = checkType === 'ai_images'
                ? pricing[type].image_generation_count
                : pricing[type].generate_videos;
            const totalUse = yield this._subscriptionRepository.getCreditsFrom(organization.id, checkFromMonth, checkType);
            return {
                credits: imageGenerationCount - totalUse,
            };
        });
    }
    lifeTime(orgId, identifier, subscription) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.createOrUpdateSubscription(false, identifier, identifier, pricing[subscription].channel, subscription, 'YEARLY', null, identifier, orgId);
        });
    }
    addSubscription(orgId, userId, subscription) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._subscriptionRepository.setCustomerId(orgId, userId);
            return this.createOrUpdateSubscription(false, makeId(5), userId, pricing[subscription].channel, subscription, 'MONTHLY', null, undefined, orgId);
        });
    }
};
SubscriptionService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [SubscriptionRepository,
        IntegrationService,
        OrganizationService])
], SubscriptionService);
export { SubscriptionService };
//# sourceMappingURL=subscription.service.js.map