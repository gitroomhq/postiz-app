import { __awaiter, __decorate, __metadata } from "tslib";
import { PrismaRepository } from "../prisma.service";
import { Injectable } from '@nestjs/common';
import { Provider } from '@prisma/client';
import { AuthService } from "../../../../../helpers/src/auth/auth.service";
let UsersRepository = class UsersRepository {
    constructor(_user) {
        this._user = _user;
    }
    getImpersonateUser(name) {
        return this._user.model.user.findMany({
            where: {
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
            select: {
                id: true,
                name: true,
                email: true,
            },
            take: 10,
        });
    }
    getUserById(id) {
        return this._user.model.user.findFirst({
            where: {
                id,
            },
        });
    }
    getUserByEmail(email) {
        return this._user.model.user.findFirst({
            where: {
                email,
                providerName: Provider.LOCAL,
            },
            include: {
                picture: {
                    select: {
                        id: true,
                        path: true,
                    },
                },
            },
        });
    }
    activateUser(id) {
        return this._user.model.user.update({
            where: {
                id,
            },
            data: {
                activated: true,
            },
        });
    }
    getUserByProvider(providerId, provider) {
        return this._user.model.user.findFirst({
            where: {
                providerId,
                providerName: provider,
            },
        });
    }
    updatePassword(id, password) {
        return this._user.model.user.update({
            where: {
                id,
                providerName: Provider.LOCAL,
            },
            data: {
                password: AuthService.hashPassword(password),
            },
        });
    }
    changeAudienceSize(userId, audience) {
        return this._user.model.user.update({
            where: {
                id: userId,
            },
            data: {
                audience,
            },
        });
    }
    getPersonal(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this._user.model.user.findUnique({
                where: {
                    id: userId,
                },
                select: {
                    id: true,
                    name: true,
                    bio: true,
                    picture: {
                        select: {
                            id: true,
                            path: true,
                        },
                    },
                },
            });
            return user;
        });
    }
    changePersonal(userId, body) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._user.model.user.update({
                where: {
                    id: userId,
                },
                data: {
                    name: body.fullname,
                    bio: body.bio,
                    picture: body.picture
                        ? {
                            connect: {
                                id: body.picture.id,
                            },
                        }
                        : {
                            disconnect: true,
                        },
                },
            });
        });
    }
    getEmailNotifications(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._user.model.user.findUnique({
                where: {
                    id: userId,
                },
                select: {
                    sendSuccessEmails: true,
                    sendFailureEmails: true,
                    sendStreakEmails: true,
                },
            });
        });
    }
    updateEmailNotifications(userId, body) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._user.model.user.update({
                where: {
                    id: userId,
                },
                data: {
                    sendSuccessEmails: body.sendSuccessEmails,
                    sendFailureEmails: body.sendFailureEmails,
                    sendStreakEmails: body.sendStreakEmails,
                },
            });
        });
    }
};
UsersRepository = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaRepository])
], UsersRepository);
export { UsersRepository };
//# sourceMappingURL=users.repository.js.map