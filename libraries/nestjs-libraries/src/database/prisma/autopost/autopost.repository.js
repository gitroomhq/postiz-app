import { __awaiter, __decorate, __metadata } from "tslib";
import { PrismaRepository } from "../prisma.service";
import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
let AutopostRepository = class AutopostRepository {
    constructor(_autoPost) {
        this._autoPost = _autoPost;
    }
    getTotal(orgId) {
        return this._autoPost.model.autoPost.count({
            where: {
                organizationId: orgId,
                deletedAt: null,
            },
        });
    }
    getAutoposts(orgId) {
        return this._autoPost.model.autoPost.findMany({
            where: {
                organizationId: orgId,
                deletedAt: null,
            },
        });
    }
    deleteAutopost(orgId, id) {
        return this._autoPost.model.autoPost.update({
            where: {
                id,
                organizationId: orgId,
            },
            data: {
                deletedAt: new Date(),
            },
        });
    }
    getAutopost(id) {
        return this._autoPost.model.autoPost.findUnique({
            where: {
                id,
                deletedAt: null,
            },
        });
    }
    updateUrl(id, url) {
        return this._autoPost.model.autoPost.update({
            where: {
                id,
            },
            data: {
                lastUrl: url,
            },
        });
    }
    changeActive(orgId, id, active) {
        return this._autoPost.model.autoPost.update({
            where: {
                id,
                organizationId: orgId,
            },
            data: {
                active,
            },
        });
    }
    createAutopost(orgId, body, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const { id: newId, active } = yield this._autoPost.model.autoPost.upsert({
                where: {
                    id: id || uuidv4(),
                    organizationId: orgId,
                },
                create: {
                    organizationId: orgId,
                    url: body.url,
                    title: body.title,
                    integrations: JSON.stringify(body.integrations),
                    active: body.active,
                    content: body.content,
                    generateContent: body.generateContent,
                    addPicture: body.addPicture,
                    syncLast: body.syncLast,
                    onSlot: body.onSlot,
                    lastUrl: body.lastUrl,
                },
                update: {
                    url: body.url,
                    title: body.title,
                    integrations: JSON.stringify(body.integrations),
                    active: body.active,
                    content: body.content,
                    generateContent: body.generateContent,
                    addPicture: body.addPicture,
                    syncLast: body.syncLast,
                    onSlot: body.onSlot,
                    lastUrl: body.lastUrl,
                },
            });
            return { id: newId, active };
        });
    }
};
AutopostRepository = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaRepository])
], AutopostRepository);
export { AutopostRepository };
//# sourceMappingURL=autopost.repository.js.map