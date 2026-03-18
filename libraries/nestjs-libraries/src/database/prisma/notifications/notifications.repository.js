import { __awaiter, __decorate, __metadata } from "tslib";
import { PrismaRepository } from "../prisma.service";
import { Injectable } from '@nestjs/common';
let NotificationsRepository = class NotificationsRepository {
    constructor(_notifications, _user) {
        this._notifications = _notifications;
        this._user = _user;
    }
    getLastReadNotification(userId) {
        return this._user.model.user.findFirst({
            where: {
                id: userId,
            },
            select: {
                lastReadNotifications: true,
            },
        });
    }
    getMainPageCount(organizationId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { lastReadNotifications } = (yield this.getLastReadNotification(userId));
            return {
                total: yield this._notifications.model.notifications.count({
                    where: {
                        organizationId,
                        createdAt: {
                            gt: lastReadNotifications,
                        },
                    },
                }),
            };
        });
    }
    createNotification(organizationId, content) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._notifications.model.notifications.create({
                data: {
                    organizationId,
                    content,
                },
            });
        });
    }
    getNotificationsSince(organizationId, since) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._notifications.model.notifications.findMany({
                where: {
                    organizationId,
                    createdAt: {
                        gte: new Date(since),
                    },
                },
            });
        });
    }
    getNotificationsPaginated(organizationId, page) {
        return __awaiter(this, void 0, void 0, function* () {
            const limit = 100;
            const skip = page * limit;
            const where = {
                organizationId,
                deletedAt: null,
            };
            const [notifications, total] = yield Promise.all([
                this._notifications.model.notifications.findMany({
                    where,
                    orderBy: {
                        createdAt: 'desc',
                    },
                    skip,
                    take: limit,
                    select: {
                        id: true,
                        content: true,
                        link: true,
                        createdAt: true,
                    },
                }),
                this._notifications.model.notifications.count({ where }),
            ]);
            return {
                notifications,
                total,
                page,
                limit,
                hasMore: skip + notifications.length < total,
            };
        });
    }
    getNotifications(organizationId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { lastReadNotifications } = (yield this.getLastReadNotification(userId));
            yield this._user.model.user.update({
                where: {
                    id: userId,
                },
                data: {
                    lastReadNotifications: new Date(),
                },
            });
            return {
                lastReadNotifications,
                notifications: yield this._notifications.model.notifications.findMany({
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 10,
                    where: {
                        organizationId,
                    },
                    select: {
                        createdAt: true,
                        content: true,
                    },
                }),
            };
        });
    }
};
NotificationsRepository = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaRepository,
        PrismaRepository])
], NotificationsRepository);
export { NotificationsRepository };
//# sourceMappingURL=notifications.repository.js.map