import { __awaiter, __decorate, __metadata } from "tslib";
import { PrismaRepository } from "../prisma.service";
import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import { makeId } from "../../../services/make.is";
import { UploadFactory } from "../../../upload/upload.factory";
let IntegrationRepository = class IntegrationRepository {
    constructor(_integration, _posts, _plugs, _exisingPlugData, _customers, _mentions) {
        this._integration = _integration;
        this._posts = _posts;
        this._plugs = _plugs;
        this._exisingPlugData = _exisingPlugData;
        this._customers = _customers;
        this._mentions = _mentions;
        this.storage = UploadFactory.createStorage();
    }
    getMentions(platform, q) {
        return this._mentions.model.mentions.findMany({
            where: {
                platform,
                OR: [
                    {
                        name: {
                            contains: q,
                            mode: 'insensitive',
                        },
                    },
                    {
                        username: {
                            contains: q,
                            mode: 'insensitive',
                        },
                    },
                ],
            },
            orderBy: {
                name: 'asc',
            },
            take: 100,
            select: {
                name: true,
                username: true,
                image: true,
            },
        });
    }
    insertMentions(platform, mentions) {
        if (mentions.length === 0) {
            return [];
        }
        return this._mentions.model.mentions.createMany({
            data: mentions.map((mention) => ({
                platform,
                name: mention.name,
                username: mention.username,
                image: mention.image,
            })),
            skipDuplicates: true,
        });
    }
    checkPreviousConnections(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const findIt = yield this._integration.model.integration.findMany({
                where: {
                    rootInternalId: id.split('_').pop(),
                },
                select: {
                    organizationId: true,
                    id: true,
                },
            });
            if (findIt.some((f) => f.organizationId === org)) {
                return false;
            }
            return findIt.length > 0;
        });
    }
    updateProviderSettings(org, id, settings) {
        return this._integration.model.integration.update({
            where: {
                id,
                organizationId: org,
            },
            data: {
                additionalSettings: settings,
            },
        });
    }
    setTimes(org, id, times) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integration.model.integration.update({
                select: {
                    id: true,
                },
                where: {
                    id,
                    organizationId: org,
                },
                data: {
                    postingTimes: JSON.stringify(times.time),
                },
            });
        });
    }
    getPlug(plugId) {
        return this._plugs.model.plugs.findFirst({
            where: {
                id: plugId,
            },
            include: {
                integration: true,
            },
        });
    }
    getPlugs(orgId, integrationId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._plugs.model.plugs.findMany({
                where: {
                    integrationId,
                    organizationId: orgId,
                    activated: true,
                },
                include: {
                    integration: {
                        select: {
                            id: true,
                            providerIdentifier: true,
                        },
                    },
                },
            });
        });
    }
    updateIntegration(id, params) {
        return __awaiter(this, void 0, void 0, function* () {
            if (params.picture &&
                (params.picture.indexOf(process.env.CLOUDFLARE_BUCKET_URL) === -1 ||
                    params.picture.indexOf(process.env.FRONTEND_URL) === -1)) {
                params.picture = yield this.storage.uploadSimple(params.picture);
            }
            const existing = yield this._integration.model.integration.findUnique({
                where: {
                    organizationId_internalId: {
                        organizationId: params.organizationId,
                        internalId: params.internalId,
                    },
                },
            });
            if (existing) {
                yield this._posts.model.post.updateMany({
                    where: {
                        integrationId: id,
                    },
                    data: {
                        deletedAt: new Date(),
                    },
                });
                yield this._integration.model.integration.update({
                    where: {
                        id,
                    },
                    data: {
                        internalId: `deleted_${params.internalId}_${makeId(10)}`,
                        deletedAt: new Date(),
                    },
                });
            }
            return this._integration.model.integration.update({
                where: Object.assign({}, (existing ? { id: existing.id } : { id })),
                data: Object.assign(Object.assign({}, params), { disabled: false, deletedAt: null }),
            });
        });
    }
    disconnectChannel(org, id) {
        return this._integration.model.integration.update({
            where: {
                id,
                organizationId: org,
            },
            data: {
                refreshNeeded: true,
            },
        });
    }
    createOrUpdateIntegration(additionalSettings_1, oneTimeToken_1, org_1, name_1, picture_1, type_1, internalId_1, provider_1, token_1) {
        return __awaiter(this, arguments, void 0, function* (additionalSettings, oneTimeToken, org, name, picture, type, internalId, provider, token, refreshToken = '', expiresIn = 999999999, username, isBetweenSteps = false, refresh, timezone, customInstanceDetails) {
            var _a;
            const postTimes = timezone
                ? {
                    postingTimes: JSON.stringify([
                        { time: 560 - timezone },
                        { time: 850 - timezone },
                        { time: 1140 - timezone },
                    ]),
                }
                : {};
            const upsert = yield this._integration.model.integration.upsert({
                where: {
                    organizationId_internalId: {
                        internalId,
                        organizationId: org,
                    },
                },
                create: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ type: type, name, providerIdentifier: provider, token, profile: username }, (picture ? { picture } : {})), { inBetweenSteps: isBetweenSteps, refreshToken }), (expiresIn
                    ? { tokenExpiration: new Date(Date.now() + expiresIn * 1000) }
                    : {})), { internalId }), postTimes), { organizationId: org, refreshNeeded: false, rootInternalId: internalId.split('_').pop() }), (customInstanceDetails ? { customInstanceDetails } : {})), { additionalSettings: additionalSettings
                        ? JSON.stringify(additionalSettings)
                        : '[]' }),
                update: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (additionalSettings
                    ? { additionalSettings: JSON.stringify(additionalSettings) }
                    : {})), (customInstanceDetails ? { customInstanceDetails } : {})), { type: type }), (!refresh
                    ? {
                        inBetweenSteps: isBetweenSteps,
                    }
                    : {})), (picture ? { picture } : {})), { profile: username, providerIdentifier: provider, token,
                    refreshToken }), (expiresIn
                    ? { tokenExpiration: new Date(Date.now() + expiresIn * 1000) }
                    : {})), { internalId, organizationId: org, deletedAt: null, refreshNeeded: false }),
            });
            if (oneTimeToken) {
                const rootId = ((_a = (yield this._integration.model.integration.findFirst({
                    where: {
                        organizationId: org,
                        internalId: internalId,
                    },
                }))) === null || _a === void 0 ? void 0 : _a.rootInternalId) || internalId.split('_').pop();
                yield this._integration.model.integration.updateMany({
                    where: {
                        id: {
                            not: upsert.id,
                        },
                        rootInternalId: rootId,
                    },
                    data: Object.assign({ token,
                        refreshToken, refreshNeeded: false }, (expiresIn
                        ? { tokenExpiration: new Date(Date.now() + expiresIn * 1000) }
                        : {})),
                });
            }
            return upsert;
        });
    }
    needsToBeRefreshed() {
        return this._integration.model.integration.findMany({
            where: {
                tokenExpiration: {
                    lte: dayjs().add(1, 'day').toDate(),
                },
                inBetweenSteps: false,
                deletedAt: null,
                refreshNeeded: false,
            },
        });
    }
    setBetweenRefreshSteps(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integration.model.integration.update({
                where: {
                    id,
                },
                data: {
                    inBetweenSteps: true,
                },
            });
        });
    }
    refreshNeeded(org, id) {
        return this._integration.model.integration.update({
            where: {
                id,
                organizationId: org,
            },
            data: {
                refreshNeeded: true,
            },
        });
    }
    updateNameAndUrl(id, name, url) {
        return this._integration.model.integration.update({
            where: {
                id,
            },
            data: Object.assign(Object.assign({}, (name ? { name } : {})), (url ? { picture: url } : {})),
        });
    }
    getIntegrationById(org, id) {
        return this._integration.model.integration.findFirst({
            where: {
                organizationId: org,
                id,
            },
        });
    }
    getIntegrationForOrder(id, order, user, org) {
        return __awaiter(this, void 0, void 0, function* () {
            const integration = yield this._posts.model.post.findFirst({
                where: {
                    integrationId: id,
                    submittedForOrder: {
                        id: order,
                        messageGroup: {
                            OR: [
                                { sellerId: user },
                                { buyerId: user },
                                { buyerOrganizationId: org },
                            ],
                        },
                    },
                },
                select: {
                    integration: {
                        select: {
                            id: true,
                            name: true,
                            picture: true,
                            inBetweenSteps: true,
                            providerIdentifier: true,
                        },
                    },
                },
            });
            return integration === null || integration === void 0 ? void 0 : integration.integration;
        });
    }
    updateOnCustomerName(org, id, name) {
        return __awaiter(this, void 0, void 0, function* () {
            const customer = !name
                ? undefined
                : (yield this._customers.model.customer.findFirst({
                    where: {
                        orgId: org,
                        name,
                    },
                })) ||
                    (yield this._customers.model.customer.create({
                        data: {
                            name,
                            orgId: org,
                        },
                    }));
            return this._integration.model.integration.update({
                where: {
                    id,
                    organizationId: org,
                },
                data: {
                    customer: !customer
                        ? { disconnect: true }
                        : {
                            connect: {
                                id: customer.id,
                            },
                        },
                },
            });
        });
    }
    updateIntegrationGroup(org, id, group) {
        return this._integration.model.integration.update({
            where: {
                id,
                organizationId: org,
            },
            data: !group
                ? {
                    customer: {
                        disconnect: true,
                    },
                }
                : {
                    customer: {
                        connect: {
                            id: group,
                        },
                    },
                },
        });
    }
    customers(orgId) {
        return this._customers.model.customer.findMany({
            where: {
                orgId,
                deletedAt: null,
            },
        });
    }
    getIntegrationsList(org) {
        return this._integration.model.integration.findMany({
            where: {
                organizationId: org,
                deletedAt: null,
            },
            include: {
                customer: true,
            },
        });
    }
    disableChannel(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._integration.model.integration.update({
                where: {
                    id,
                    organizationId: org,
                },
                data: {
                    disabled: true,
                },
            });
        });
    }
    enableChannel(org, id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._integration.model.integration.update({
                where: {
                    id,
                    organizationId: org,
                },
                data: {
                    disabled: false,
                },
            });
        });
    }
    getPostsForChannel(org, id) {
        return this._posts.model.post.groupBy({
            by: ['group'],
            where: {
                organizationId: org,
                integrationId: id,
                deletedAt: null,
            },
        });
    }
    deleteChannel(org, id) {
        return this._integration.model.integration.update({
            where: {
                id,
                organizationId: org,
            },
            data: {
                deletedAt: new Date(),
            },
        });
    }
    checkForDeletedOnceAndUpdate(org, page) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integration.model.integration.updateMany({
                where: {
                    organizationId: org,
                    internalId: page,
                    deletedAt: {
                        not: null,
                    },
                },
                data: {
                    internalId: makeId(10),
                },
            });
        });
    }
    disableIntegrations(org, totalChannels) {
        return __awaiter(this, void 0, void 0, function* () {
            const getChannels = yield this._integration.model.integration.findMany({
                where: {
                    organizationId: org,
                    disabled: false,
                    deletedAt: null,
                },
                take: totalChannels,
                select: {
                    id: true,
                },
            });
            for (const channel of getChannels) {
                yield this._integration.model.integration.update({
                    where: {
                        id: channel.id,
                    },
                    data: {
                        disabled: true,
                    },
                });
            }
        });
    }
    getPlugsByIntegrationId(org, id) {
        return this._plugs.model.plugs.findMany({
            where: {
                organizationId: org,
                integrationId: id,
            },
        });
    }
    createOrUpdatePlug(org, integrationId, body) {
        return this._plugs.model.plugs.upsert({
            where: {
                organizationId: org,
                plugFunction_integrationId: {
                    integrationId,
                    plugFunction: body.func,
                },
            },
            create: {
                integrationId,
                organizationId: org,
                plugFunction: body.func,
                data: JSON.stringify(body.fields),
                activated: true,
            },
            update: {
                data: JSON.stringify(body.fields),
            },
            select: {
                activated: true,
            },
        });
    }
    changePlugActivation(orgId, plugId, status) {
        return this._plugs.model.plugs.update({
            where: {
                organizationId: orgId,
                id: plugId,
            },
            data: {
                activated: !!status,
            },
        });
    }
    loadExisingData(methodName, integrationId, id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._exisingPlugData.model.exisingPlugData.findMany({
                where: {
                    integrationId,
                    methodName,
                    value: {
                        in: id,
                    },
                },
            });
        });
    }
    saveExisingData(methodName, integrationId, value) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._exisingPlugData.model.exisingPlugData.createMany({
                data: value.map((p) => ({
                    integrationId,
                    methodName,
                    value: p,
                })),
            });
        });
    }
    getPostingTimes(orgId, integrationsId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._integration.model.integration.findMany({
                where: Object.assign(Object.assign({}, (integrationsId ? { id: integrationsId } : {})), { organizationId: orgId, disabled: false, deletedAt: null }),
                select: {
                    postingTimes: true,
                },
            });
        });
    }
};
IntegrationRepository = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaRepository,
        PrismaRepository,
        PrismaRepository,
        PrismaRepository,
        PrismaRepository,
        PrismaRepository])
], IntegrationRepository);
export { IntegrationRepository };
//# sourceMappingURL=integration.repository.js.map