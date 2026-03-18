import { __awaiter, __decorate, __metadata } from "tslib";
import { PrismaRepository } from "../prisma.service";
import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
let WebhooksRepository = class WebhooksRepository {
    constructor(_webhooks) {
        this._webhooks = _webhooks;
    }
    getTotal(orgId) {
        return this._webhooks.model.webhooks.count({
            where: {
                organizationId: orgId,
                deletedAt: null,
            },
        });
    }
    getWebhooks(orgId) {
        return this._webhooks.model.webhooks.findMany({
            where: {
                organizationId: orgId,
                deletedAt: null,
            },
            include: {
                integrations: {
                    select: {
                        integration: {
                            select: {
                                id: true,
                                picture: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });
    }
    deleteWebhook(orgId, id) {
        return this._webhooks.model.webhooks.update({
            where: {
                id,
                organizationId: orgId,
            },
            data: {
                deletedAt: new Date(),
            },
        });
    }
    createWebhook(orgId, body) {
        return __awaiter(this, void 0, void 0, function* () {
            const { id } = yield this._webhooks.model.webhooks.upsert({
                where: {
                    id: body.id || uuidv4(),
                    organizationId: orgId,
                },
                create: {
                    organizationId: orgId,
                    url: body.url,
                    name: body.name,
                },
                update: {
                    url: body.url,
                    name: body.name,
                },
            });
            yield this._webhooks.model.webhooks.update({
                where: {
                    id,
                    organizationId: orgId,
                },
                data: {
                    integrations: {
                        deleteMany: {},
                        create: body.integrations.map((integration) => ({
                            integrationId: integration.id,
                        })),
                    },
                },
            });
            return { id };
        });
    }
};
WebhooksRepository = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaRepository])
], WebhooksRepository);
export { WebhooksRepository };
//# sourceMappingURL=webhooks.repository.js.map