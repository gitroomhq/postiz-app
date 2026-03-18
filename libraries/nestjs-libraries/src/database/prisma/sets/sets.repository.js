import { __awaiter, __decorate, __metadata } from "tslib";
import { PrismaRepository } from "../prisma.service";
import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
let SetsRepository = class SetsRepository {
    constructor(_sets) {
        this._sets = _sets;
    }
    getTotal(orgId) {
        return this._sets.model.sets.count({
            where: {
                organizationId: orgId,
            },
        });
    }
    getSets(orgId) {
        return this._sets.model.sets.findMany({
            where: {
                organizationId: orgId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    deleteSet(orgId, id) {
        return this._sets.model.sets.delete({
            where: {
                id,
                organizationId: orgId,
            },
        });
    }
    createSet(orgId, body) {
        return __awaiter(this, void 0, void 0, function* () {
            const { id } = yield this._sets.model.sets.upsert({
                where: {
                    id: body.id || uuidv4(),
                    organizationId: orgId,
                },
                create: {
                    id: body.id || uuidv4(),
                    organizationId: orgId,
                    name: body.name,
                    content: body.content,
                },
                update: {
                    name: body.name,
                    content: body.content,
                },
            });
            return { id };
        });
    }
};
SetsRepository = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaRepository])
], SetsRepository);
export { SetsRepository };
//# sourceMappingURL=sets.repository.js.map