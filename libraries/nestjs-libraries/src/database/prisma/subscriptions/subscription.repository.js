import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@nestjs/common';
import { PrismaRepository, } from "../prisma.service";
let SubscriptionRepository = class SubscriptionRepository {
    constructor(_subscription, _organization, _user, _credits, _usedCodes) {
        this._subscription = _subscription;
        this._organization = _organization;
        this._user = _user;
        this._credits = _credits;
        this._usedCodes = _usedCodes;
    }
    getUserAccount(userId) {
        return this._user.model.user.findFirst({
            where: {
                id: userId,
            },
            select: {
                account: true,
                connectedAccount: true,
            },
        });
    }
    getCode(code) {
        return this._usedCodes.model.usedCodes.findFirst({
            where: {
                code,
            },
        });
    }
    updateAccount(userId, account) {
        return this._user.model.user.update({
            where: {
                id: userId,
            },
            data: {
                account,
            },
        });
    }
    getSubscriptionByOrganizationId(organizationId) {
        return this._subscription.model.subscription.findFirst({
            where: {
                organizationId,
                deletedAt: null,
            },
        });
    }
    updateConnectedStatus(account, accountCharges) {
        return this._user.model.user.updateMany({
            where: {
                account,
            },
            data: {
                connectedAccount: accountCharges,
            },
        });
    }
    getCustomerIdByOrgId(organizationId) {
        return this._organization.model.organization.findFirst({
            where: {
                id: organizationId,
            },
            select: {
                paymentId: true,
            },
        });
    }
    checkSubscription(organizationId, subscriptionId) {
        return this._subscription.model.subscription.findFirst({
            where: {
                organizationId,
                identifier: subscriptionId,
                deletedAt: null,
            },
        });
    }
    deleteSubscriptionByCustomerId(customerId) {
        return this._subscription.model.subscription.deleteMany({
            where: {
                organization: {
                    paymentId: customerId,
                },
            },
        });
    }
    updateCustomerId(organizationId, customerId) {
        return this._organization.model.organization.update({
            where: {
                id: organizationId,
            },
            data: {
                paymentId: customerId,
            },
        });
    }
    getSubscriptionByOrgId(orgId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._subscription.model.subscription.findFirst({
                where: {
                    organizationId: orgId,
                },
            });
        });
    }
    getSubscriptionByCustomerId(customerId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._subscription.model.subscription.findFirst({
                where: {
                    organization: {
                        paymentId: customerId,
                    },
                },
            });
        });
    }
    getOrganizationByCustomerId(customerId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._organization.model.organization.findFirst({
                where: {
                    paymentId: customerId,
                },
            });
        });
    }
    createOrUpdateSubscription(isTrailing, identifier, customerId, totalChannels, billing, period, cancelAt, code, org) {
        return __awaiter(this, void 0, void 0, function* () {
            const findOrg = org || (yield this.getOrganizationByCustomerId(customerId));
            if (!findOrg) {
                return;
            }
            yield this._subscription.model.subscription.upsert({
                where: Object.assign({ organizationId: findOrg.id }, (!code
                    ? {
                        organization: {
                            paymentId: customerId,
                        },
                    }
                    : {})),
                update: {
                    subscriptionTier: billing,
                    totalChannels,
                    period,
                    identifier,
                    isLifetime: !!code,
                    cancelAt: cancelAt ? new Date(cancelAt * 1000) : null,
                    deletedAt: null,
                },
                create: {
                    organizationId: findOrg.id,
                    subscriptionTier: billing,
                    isLifetime: !!code,
                    totalChannels,
                    period,
                    cancelAt: cancelAt ? new Date(cancelAt * 1000) : null,
                    identifier,
                    deletedAt: null,
                },
            });
            yield this._organization.model.organization.update({
                where: {
                    id: findOrg.id,
                },
                data: {
                    isTrailing,
                    allowTrial: false,
                },
            });
            if (code) {
                yield this._usedCodes.model.usedCodes.create({
                    data: {
                        code,
                        orgId: findOrg.id,
                    },
                });
            }
        });
    }
    getSubscriptionByIdentifier(identifier) {
        return this._subscription.model.subscription.findFirst({
            where: {
                identifier,
                deletedAt: null,
            },
            include: {
                organization: true,
            },
        });
    }
    getSubscription(organizationId) {
        return this._subscription.model.subscription.findFirst({
            where: {
                organizationId,
                deletedAt: null,
            },
        });
    }
    getCreditsFrom(organizationId_1, from_1) {
        return __awaiter(this, arguments, void 0, function* (organizationId, from, type = 'ai_images') {
            var _a, _b;
            const load = yield this._credits.model.credits.groupBy({
                by: ['organizationId'],
                where: {
                    organizationId,
                    type,
                    createdAt: {
                        gte: from.toDate(),
                    },
                },
                _sum: {
                    credits: true,
                },
            });
            return ((_b = (_a = load === null || load === void 0 ? void 0 : load[0]) === null || _a === void 0 ? void 0 : _a._sum) === null || _b === void 0 ? void 0 : _b.credits) || 0;
        });
    }
    useCredit(org_1) {
        return __awaiter(this, arguments, void 0, function* (org, type = 'ai_images', func) {
            const data = yield this._credits.model.credits.create({
                data: {
                    organizationId: org.id,
                    credits: 1,
                    type,
                },
            });
            try {
                return yield func();
            }
            catch (err) {
                yield this._credits.model.credits.delete({
                    where: {
                        id: data.id,
                    },
                });
                throw err;
            }
        });
    }
    setCustomerId(orgId, customerId) {
        return this._organization.model.organization.update({
            where: {
                id: orgId,
            },
            data: {
                paymentId: customerId,
            },
        });
    }
};
SubscriptionRepository = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaRepository,
        PrismaRepository,
        PrismaRepository,
        PrismaRepository,
        PrismaRepository])
], SubscriptionRepository);
export { SubscriptionRepository };
//# sourceMappingURL=subscription.repository.js.map