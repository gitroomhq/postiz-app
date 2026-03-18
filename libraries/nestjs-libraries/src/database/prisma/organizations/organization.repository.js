import { __awaiter, __decorate, __metadata } from "tslib";
import { PrismaRepository } from "../prisma.service";
import { Role, SubscriptionTier } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { AuthService } from "../../../../../helpers/src/auth/auth.service";
import { makeId } from "../../../services/make.is";
let OrganizationRepository = class OrganizationRepository {
    constructor(_organization, _userOrg, _user) {
        this._organization = _organization;
        this._userOrg = _userOrg;
        this._user = _user;
    }
    createMaxUser(id, name, saasName, email) {
        return this._organization.model.organization.create({
            select: {
                id: true,
                apiKey: true,
            },
            data: {
                name: name ? `${name}###${id}` : `Unnamed User###${id}`,
                apiKey: AuthService.fixedEncryption(makeId(20)),
                isTrailing: false,
                subscription: {
                    create: {
                        totalChannels: 1000000,
                        subscriptionTier: 'ULTIMATE',
                        isLifetime: true,
                        period: 'YEARLY',
                    },
                },
                users: {
                    create: {
                        role: Role.SUPERADMIN,
                        user: {
                            create: {
                                activated: true,
                                email: email
                                    ? email.split('@').join(`+${saasName}@`)
                                    : `${saasName}+` + makeId(10) + '@postiz.com',
                                name: name ? `${name}###${id}` : `Unnamed User###${id}`,
                                providerName: 'LOCAL',
                                password: AuthService.hashPassword(makeId(500)),
                                timezone: 0,
                            },
                        },
                    },
                },
            },
        });
    }
    getOrgByApiKey(api) {
        return this._organization.model.organization.findFirst({
            where: {
                apiKey: api,
            },
            include: {
                subscription: {
                    select: {
                        subscriptionTier: true,
                        totalChannels: true,
                        isLifetime: true,
                    },
                },
            },
        });
    }
    getCount() {
        return this._organization.model.organization.count();
    }
    getUserOrg(id) {
        return this._userOrg.model.userOrganization.findFirst({
            where: {
                id,
            },
            select: {
                user: true,
                organization: {
                    include: {
                        users: {
                            select: {
                                id: true,
                                disabled: true,
                                role: true,
                                userId: true,
                            },
                        },
                        subscription: {
                            select: {
                                subscriptionTier: true,
                                totalChannels: true,
                                isLifetime: true,
                            },
                        },
                    },
                },
            },
        });
    }
    getImpersonateUser(name) {
        return this._userOrg.model.userOrganization.findMany({
            where: {
                user: {
                    OR: [
                        {
                            name: {
                                contains: name,
                            },
                        },
                        {
                            email: {
                                contains: name,
                            },
                        },
                        {
                            id: {
                                contains: name,
                            },
                        },
                    ],
                },
            },
            select: {
                id: true,
                organization: {
                    select: {
                        id: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    }
    updateApiKey(orgId) {
        return this._organization.model.organization.update({
            where: {
                id: orgId,
            },
            data: {
                apiKey: AuthService.fixedEncryption(makeId(20)),
            },
        });
    }
    getOrgsByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._organization.model.organization.findMany({
                where: {
                    users: {
                        some: {
                            userId,
                        },
                    },
                },
                include: {
                    users: {
                        where: {
                            userId,
                        },
                        select: {
                            disabled: true,
                            role: true,
                        },
                    },
                    subscription: {
                        select: {
                            subscriptionTier: true,
                            totalChannels: true,
                            isLifetime: true,
                            createdAt: true,
                        },
                    },
                },
            });
        });
    }
    getOrgById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._organization.model.organization.findUnique({
                where: {
                    id,
                },
            });
        });
    }
    addUserToOrg(userId, id, orgId, role) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const checkIfInviteExists = yield this._user.model.user.findFirst({
                where: {
                    inviteId: id,
                },
            });
            if (checkIfInviteExists) {
                return false;
            }
            const checkForSubscription = yield this._organization.model.organization.findFirst({
                where: {
                    id: orgId,
                },
                select: {
                    subscription: true,
                },
            });
            if (process.env.STRIPE_PUBLISHABLE_KEY &&
                ((_a = checkForSubscription === null || checkForSubscription === void 0 ? void 0 : checkForSubscription.subscription) === null || _a === void 0 ? void 0 : _a.subscriptionTier) ===
                    SubscriptionTier.STANDARD) {
                return false;
            }
            const create = yield this._userOrg.model.userOrganization.create({
                data: {
                    role,
                    userId,
                    organizationId: orgId,
                },
            });
            yield this._user.model.user.update({
                where: {
                    id: userId,
                },
                data: {
                    inviteId: id,
                },
            });
            return create;
        });
    }
    createOrgAndUser(body, hasEmail, ip, userAgent) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._organization.model.organization.create({
                data: {
                    name: body.company,
                    apiKey: AuthService.fixedEncryption(makeId(20)),
                    allowTrial: true,
                    isTrailing: true,
                    users: {
                        create: {
                            role: Role.SUPERADMIN,
                            user: {
                                create: {
                                    activated: body.provider !== 'LOCAL' || !hasEmail,
                                    email: body.email,
                                    password: body.password
                                        ? AuthService.hashPassword(body.password)
                                        : '',
                                    providerName: body.provider,
                                    providerId: body.providerId || '',
                                    timezone: 0,
                                    ip,
                                    agent: userAgent,
                                },
                            },
                        },
                    },
                },
                select: {
                    id: true,
                    users: {
                        select: {
                            user: true,
                        },
                    },
                },
            });
        });
    }
    getOrgByCustomerId(customerId) {
        return this._organization.model.organization.findFirst({
            where: {
                paymentId: customerId,
            },
        });
    }
    setStreak(organizationId, type) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this._organization.model.organization.update({
                    where: Object.assign({ id: organizationId }, (type === 'start'
                        ? {
                            streakSince: null,
                        }
                        : {})),
                    data: Object.assign(Object.assign({}, (type === 'end' ? { streakSince: null } : {})), (type === 'start' ? { streakSince: new Date() } : {})),
                });
            }
            catch (err) { }
        });
    }
    getTeam(orgId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._organization.model.organization.findUnique({
                where: {
                    id: orgId,
                },
                select: {
                    users: {
                        select: {
                            role: true,
                            user: {
                                select: {
                                    email: true,
                                    id: true,
                                    sendSuccessEmails: true,
                                    sendFailureEmails: true,
                                    sendStreakEmails: true,
                                },
                            },
                        },
                    },
                },
            });
        });
    }
    getAllUsersOrgs(orgId) {
        return this._organization.model.organization.findUnique({
            where: {
                id: orgId,
            },
            select: {
                users: {
                    select: {
                        user: {
                            select: {
                                email: true,
                                id: true,
                                sendSuccessEmails: true,
                                sendFailureEmails: true,
                            },
                        },
                    },
                },
            },
        });
    }
    deleteTeamMember(orgId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._userOrg.model.userOrganization.delete({
                where: {
                    userId_organizationId: {
                        userId,
                        organizationId: orgId,
                    },
                },
            });
        });
    }
    disableOrEnableNonSuperAdminUsers(orgId, disable) {
        return this._userOrg.model.userOrganization.updateMany({
            where: {
                organizationId: orgId,
                role: {
                    not: Role.SUPERADMIN,
                },
            },
            data: {
                disabled: disable,
            },
        });
    }
    getShortlinkPreference(orgId) {
        return this._organization.model.organization.findUnique({
            where: {
                id: orgId,
            },
            select: {
                shortlink: true,
            },
        });
    }
    updateShortlinkPreference(orgId, shortlink) {
        return this._organization.model.organization.update({
            where: {
                id: orgId,
            },
            data: {
                shortlink,
            },
        });
    }
};
OrganizationRepository = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaRepository,
        PrismaRepository,
        PrismaRepository])
], OrganizationRepository);
export { OrganizationRepository };
//# sourceMappingURL=organization.repository.js.map